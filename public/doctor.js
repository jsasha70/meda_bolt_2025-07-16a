let currentQuestionnaire = null;
let currentDate = null;

// Авторизация врача
async function authenticate() {
    const password = document.getElementById('doctorPassword').value;
    const errorDiv = document.getElementById('authError');
    
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password, type: 'doctor' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('authPage').classList.add('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
        } else {
            errorDiv.textContent = result.message;
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Ошибка сервера';
        errorDiv.style.display = 'block';
    }
}

// Показать главное меню
function showMainMenu() {
    hideAllPages();
    document.getElementById('mainMenu').classList.remove('hidden');
}

// Показать настройки
async function showSettings() {
    hideAllPages();
    document.getElementById('settingsPage').classList.remove('hidden');
    
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        document.getElementById('patientPasswordSetting').value = settings.patientPassword;
        document.getElementById('doctorPasswordSetting').value = settings.doctorPassword;
        document.getElementById('thanksMessageSetting').value = settings.thanksMessage;
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
    }
}

// Сохранить настройки
async function saveSettings() {
    const settings = {
        patientPassword: document.getElementById('patientPasswordSetting').value,
        doctorPassword: document.getElementById('doctorPasswordSetting').value,
        thanksMessage: document.getElementById('thanksMessageSetting').value
    };
    
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Настройки сохранены');
        } else {
            alert('Ошибка сохранения настроек');
        }
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        alert('Ошибка сохранения настроек');
    }
}

// Показать заполнение анкеты
async function showFillQuestionnaire() {
    hideAllPages();
    document.getElementById('fillQuestionnairePage').classList.remove('hidden');
    
    try {
        const response = await fetch('/api/templates');
        const templates = await response.json();
        
        const templateList = document.getElementById('doctorTemplateList');
        templateList.innerHTML = '';
        
        templates.forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.innerHTML = `
                <h3>${template.name}</h3>
                <p>Нажмите для заполнения</p>
            `;
            templateItem.onclick = () => fillQuestionnaire(template.id);
            templateList.appendChild(templateItem);
        });
    } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error);
    }
}

// Заполнение анкеты врачом
async function fillQuestionnaire(templateId) {
    // Эта функция аналогична логике пациента, но в контексте врача
    // Здесь можно реализовать специфичную для врача логику
    window.location.href = `patient.html?doctor=true&template=${templateId}`;
}

// Показать анкеты
async function showQuestionnaires() {
    hideAllPages();
    document.getElementById('questionnairesPage').classList.remove('hidden');
    
    try {
        const response = await fetch('/api/questionnaire-dates');
        const dates = await response.json();
        
        const dateList = document.getElementById('dateList');
        dateList.innerHTML = '';
        
        dates.forEach(date => {
            const dateItem = document.createElement('div');
            dateItem.className = 'date-item';
            dateItem.innerHTML = `
                <h3>${date}</h3>
                <p>Нажмите для просмотра анкет</p>
            `;
            dateItem.onclick = () => showQuestionnairesByDate(date);
            dateList.appendChild(dateItem);
        });
    } catch (error) {
        console.error('Ошибка загрузки дат:', error);
    }
}

// Показать анкеты по дате
async function showQuestionnairesByDate(date) {
    hideAllPages();
    document.getElementById('questionnaireListPage').classList.remove('hidden');
    document.getElementById('dateTitle').textContent = `Анкеты за ${date}`;
    
    currentDate = date;
    
    try {
        const response = await fetch(`/api/questionnaires/${date}`);
        const questionnaires = await response.json();
        
        const questionnaireList = document.getElementById('questionnaireList');
        questionnaireList.innerHTML = '';
        
        questionnaires.forEach(questionnaire => {
            const questionnaireItem = document.createElement('div');
            questionnaireItem.className = 'questionnaire-item';
            questionnaireItem.innerHTML = `
                <h3>${questionnaire.name}</h3>
                <p>Нажмите для просмотра</p>
            `;
            questionnaireItem.onclick = () => viewQuestionnaire(date, questionnaire.filename);
            questionnaireList.appendChild(questionnaireItem);
        });
    } catch (error) {
        console.error('Ошибка загрузки анкет:', error);
    }
}

// Просмотр анкеты
async function viewQuestionnaire(date, filename) {
    hideAllPages();
    document.getElementById('viewQuestionnairePage').classList.remove('hidden');
    
    currentQuestionnaire = { date, filename };
    
    try {
        const response = await fetch(`/api/questionnaire/${date}/${filename}`);
        const questionnaire = await response.json();
        
        document.getElementById('viewQuestionnaireTitle').textContent = `Анкета: ${filename}`;
        
        // Получаем шаблон для отображения
        const templateResponse = await fetch(`/api/template/${questionnaire.templateId}`);
        const template = await templateResponse.json();
        
        renderViewQuestionnaire(template, questionnaire.answers);
        
        // Показываем выжимку, если есть
        if (questionnaire.summary) {
            document.getElementById('summarySection').classList.remove('hidden');
            document.getElementById('summaryContent').textContent = questionnaire.summary;
        } else {
            document.getElementById('summarySection').classList.add('hidden');
        }
    } catch (error) {
        console.error('Ошибка загрузки анкеты:', error);
    }
}

// Рендеринг анкеты для просмотра
function renderViewQuestionnaire(template, answers) {
    const content = document.getElementById('viewQuestionnaireContent');
    content.innerHTML = '';
    
    if (template.questionnaire.sections) {
        template.questionnaire.sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'section view-only';
            
            const sectionTitle = document.createElement('h3');
            sectionTitle.textContent = section.title;
            sectionDiv.appendChild(sectionTitle);
            
            if (section.questions) {
                section.questions.forEach(question => {
                    const questionDiv = createViewQuestionElement(question, answers);
                    sectionDiv.appendChild(questionDiv);
                });
            }
            
            content.appendChild(sectionDiv);
        });
    }
}

// Создание элемента вопроса для просмотра
function createViewQuestionElement(question, answers) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question view-only';
    
    const label = document.createElement('label');
    label.textContent = question.text;
    questionDiv.appendChild(label);
    
    const fieldName = `q_${question.id}`;
    const answer = answers[fieldName];
    
    const answerDiv = document.createElement('div');
    answerDiv.style.marginTop = '10px';
    answerDiv.style.padding = '10px';
    answerDiv.style.background = '#f0f0f0';
    answerDiv.style.borderRadius = '5px';
    
    if (Array.isArray(answer)) {
        answerDiv.textContent = answer.join(', ');
    } else {
        answerDiv.textContent = answer || '(не заполнено)';
    }
    
    questionDiv.appendChild(answerDiv);
    return questionDiv;
}

// Редактирование анкеты
function editQuestionnaire() {
    // Здесь можно реализовать редактирование анкеты
    alert('Функция редактирования будет реализована в следующих версиях');
}

// Копирование выжимки
function copySummary() {
    const summaryContent = document.getElementById('summaryContent').textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(summaryContent).then(() => {
            alert('Выжимка скопирована в буфер обмена');
        }).catch(err => {
            console.error('Ошибка копирования:', err);
            fallbackCopy(summaryContent);
        });
    } else {
        fallbackCopy(summaryContent);
    }
}

// Fallback для копирования
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('Выжимка скопирована в буфер обмена');
}

// Возврат к списку анкет
function goBackToList() {
    showQuestionnairesByDate(currentDate);
}

// Отмена редактирования
function cancelEdit() {
    viewQuestionnaire(currentQuestionnaire.date, currentQuestionnaire.filename);
}

// Скрытие всех страниц
function hideAllPages() {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.add('hidden');
    });
}

// Обработка Enter в поле пароля
document.getElementById('doctorPassword').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        authenticate();
    }
});