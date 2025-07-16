const express = require('express');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Создание необходимых папок
const createDirectories = () => {
  const dirs = ['anketa', 'templates', 'text-templates'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Загрузка конфигурации
const loadConfig = () => {
  const defaultConfig = {
    patientPassword: 'patient123',
    doctorPassword: 'doctor123',
    thanksMessage: 'спасибо за заполнение анкеты'
  };
  
  try {
    if (fs.existsSync('config.json')) {
      return JSON.parse(fs.readFileSync('config.json', 'utf8'));
    }
  } catch (err) {
    console.error('Ошибка загрузки конфигурации:', err);
  }
  
  return defaultConfig;
};

// Сохранение конфигурации
const saveConfig = (config) => {
  try {
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('Ошибка сохранения конфигурации:', err);
  }
};

let config = loadConfig();

// Парсер XML
const xmlParser = new xml2js.Parser();
const xmlBuilder = new xml2js.Builder();

// API для авторизации
app.post('/api/auth', (req, res) => {
  const { password, type } = req.body;
  
  if (type === 'patient' && password === config.patientPassword) {
    res.json({ success: true, role: 'patient' });
  } else if (type === 'doctor' && password === config.doctorPassword) {
    res.json({ success: true, role: 'doctor' });
  } else {
    res.json({ success: false, message: 'Неверный пароль' });
  }
});

// API для получения списка шаблонов анкет
app.get('/api/templates', (req, res) => {
  try {
    const templates = fs.readdirSync('templates')
      .filter(file => file.endsWith('.templ'))
      .map(file => ({
        id: file.replace('.templ', ''),
        name: file.replace('.templ', '').replace(/-/g, ' ')
      }));
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения шаблонов' });
  }
});

// API для получения шаблона анкеты
app.get('/api/template/:id', (req, res) => {
  try {
    const templatePath = path.join('templates', req.params.id + '.templ');
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Шаблон не найден' });
    }
    
    const xmlData = fs.readFileSync(templatePath, 'utf8');
    xmlParser.parseString(xmlData, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка парсинга XML' });
      }
      res.json(result);
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения шаблона' });
  }
});

// API для сохранения анкеты
app.post('/api/save-questionnaire', (req, res) => {
  try {
    const { templateId, answers } = req.body;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    // Создаем папку для даты
    const dateDir = path.join('anketa', dateStr);
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }
    
    // Получаем имя пациента (первое текстовое поле)
    let patientName = '';
    for (const [key, value] of Object.entries(answers)) {
      if (typeof value === 'string' && value.trim()) {
        patientName = value.trim().replace(/[<>:"/\\|?*]/g, '');
        break;
      }
    }
    
    // Формируем имя файла
    const filename = `${timeStr}_${templateId}_${patientName}.quest`;
    const filePath = path.join(dateDir, filename);
    
    // Создаем XML структуру
    const xmlData = {
      questionnaire: {
        templateId: templateId,
        timestamp: now.toISOString(),
        patientName: patientName,
        answers: answers
      }
    };
    
    // Сохраняем XML
    const xmlString = xmlBuilder.buildObject(xmlData);
    fs.writeFileSync(filePath, xmlString);
    
    // Генерируем текстовую выжимку
    generateSummary(templateId, answers, filePath);
    
    res.json({ success: true, filename });
  } catch (err) {
    console.error('Ошибка сохранения анкеты:', err);
    res.status(500).json({ error: 'Ошибка сохранения анкеты' });
  }
});

// Функция генерации текстовой выжимки
const generateSummary = (templateId, answers, questPath) => {
  try {
    const textTemplatePath = path.join('text-templates', templateId + '.text');
    if (!fs.existsSync(textTemplatePath)) {
      return;
    }
    
    let template = fs.readFileSync(textTemplatePath, 'utf8');
    
    // Заменяем плейсхолдеры на реальные значения
    for (const [key, value] of Object.entries(answers)) {
      const placeholder = `{{${key}}}`;
      template = template.replace(new RegExp(placeholder, 'g'), value || '');
    }
    
    // Сохраняем выжимку в том же файле
    const xmlData = fs.readFileSync(questPath, 'utf8');
    xmlParser.parseString(xmlData, (err, result) => {
      if (!err) {
        result.questionnaire.summary = template;
        const updatedXml = xmlBuilder.buildObject(result);
        fs.writeFileSync(questPath, updatedXml);
      }
    });
  } catch (err) {
    console.error('Ошибка генерации выжимки:', err);
  }
};

// API для получения списка дат анкет
app.get('/api/questionnaire-dates', (req, res) => {
  try {
    const dates = fs.readdirSync('anketa')
      .filter(item => fs.statSync(path.join('anketa', item)).isDirectory())
      .sort()
      .reverse();
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения дат' });
  }
});

// API для получения анкет по дате
app.get('/api/questionnaires/:date', (req, res) => {
  try {
    const dateDir = path.join('anketa', req.params.date);
    if (!fs.existsSync(dateDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(dateDir)
      .filter(file => file.endsWith('.quest'))
      .map(file => ({
        filename: file,
        name: file.replace('.quest', '').replace(/_/g, ' ')
      }));
    
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения анкет' });
  }
});

// API для получения анкеты
app.get('/api/questionnaire/:date/:filename', (req, res) => {
  try {
    const filePath = path.join('anketa', req.params.date, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Анкета не найдена' });
    }
    
    const xmlData = fs.readFileSync(filePath, 'utf8');
    xmlParser.parseString(xmlData, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка парсинга XML' });
      }
      res.json(result.questionnaire);
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка чтения анкеты' });
  }
});

// API для настроек
app.get('/api/settings', (req, res) => {
  res.json(config);
});

app.post('/api/settings', (req, res) => {
  config = { ...config, ...req.body };
  saveConfig(config);
  res.json({ success: true });
});

// API для получения сообщения благодарности
app.get('/api/thanks-message', (req, res) => {
  res.json({ message: config.thanksMessage });
});

// Запуск сервера
app.listen(PORT, () => {
  createDirectories();
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте браузер: http://localhost:${PORT}`);
});