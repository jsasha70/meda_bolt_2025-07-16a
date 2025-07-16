let currentTemplate = null;

// Авторизация пациента
async function authenticate() {
    const password = document.getElementById('patientPassword').value;
    const errorDiv = document.getElementById('authError');
    
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password, type: 'patient' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('authPage').classList.add('hidden');
            document.getElementById('templateSelection').classList.remove('hidden');
            loadTemplates();
            loadThanksMessage();
        } else {
            errorDiv.textContent = result.message;
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Ошибка сервера';
        errorDiv.style.display = 'block';
    }
}

// Загрузка списка шаблонов
async function loadTemplates() {
    try {
        const response = await fetch('/api/templates');
        const templates = await response.json();
        
        const templateList = document.getElementById('templateList');
        templateList.innerHTML = '';
        
        templates.forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.innerHTML = `
                <h3>${template.name}</h3>
                <p>Нажмите для заполнения</p>
            `;
            templateItem.onclick = () => selectTemplate(template.id);
            templateList.appendChild(templateItem);
        });
    } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error);
    }
}

// Выбор шаблона и загрузка анкеты
async function selectTemplate(templateId) {
    try {
        const response = await fetch(`/api/template/${templateId}`);
        const template = await response.json();
        
        currentTemplate = { id: templateId, data: template };
        
        document.getElementById('templateSelection').classList.add('hidden');
        document.getElementById('questionnairePage').classList.remove('hidden');
        
        renderQuestionnaire(template);
    } catch (error) {
        console.error('Ошибка загрузки шаблона:', error);
    }
}

// Рендеринг анкеты
function renderQuestionnaire(template) {
    const content = document.getElementById('questionnaireContent');
    const title = document.getElementById('questionnaireTitle');
    
    console.log('Рендеринг анкеты:', template);
    console.log('Полная структура template:', JSON.stringify(template, null, 2));
    
    title.textContent = template.questionnaire.title || 'Анкета';
    content.innerHTML = '';
    
    // xml2js парсит XML в специфическом формате
    let sections = [];
    
    console.log('template.questionnaire:', template.questionnaire);
    console.log('template.questionnaire.sections:', template.questionnaire.sections);
    
    if (template.questionnaire && template.questionnaire.sections) {
        // xml2js всегда создает массивы для элементов
        if (Array.isArray(template.questionnaire.sections)) {
            // Если sections - это массив, берем первый элемент
            const sectionsContainer = template.questionnaire.sections[0];
            console.log('sectionsContainer:', sectionsContainer);
            
            if (sectionsContainer && sectionsContainer.section) {
                sections = Array.isArray(sectionsContainer.section) 
                    ? sectionsContainer.section 
                    : [sectionsContainer.section];
            }
        } else if (template.questionnaire.sections.section) {
            sections = Array.isArray(template.questionnaire.sections.section) 
                ? template.questionnaire.sections.section 
                : [template.questionnaire.sections.section];
        }
    }
    
    console.log('Найденные секции:', sections);
    
    if (sections && sections.length > 0) {
        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'section';
            
            const sectionTitle = document.createElement('h3');
            // xml2js оборачивает текстовые значения в массивы
            const titleText = Array.isArray(section.title) ? section.title[0] : section.title;
            sectionTitle.textContent = titleText || 'Раздел';
            console.log('Заголовок секции:', titleText);
            sectionDiv.appendChild(sectionTitle);
            
            // Обрабатываем вопросы - xml2js создает массивы
            let questions = [];
            console.log('section.questions:', section.questions);
            
            if (section.questions) {
                if (Array.isArray(section.questions)) {
                    // Если questions - это массив, берем первый элемент
                    const questionsContainer = section.questions[0];
                    console.log('questionsContainer:', questionsContainer);
                    
                    if (questionsContainer && questionsContainer.question) {
                        questions = Array.isArray(questionsContainer.question) 
                            ? questionsContainer.question 
                            : [questionsContainer.question];
                    }
                } else if (section.questions.question) {
                    questions = Array.isArray(section.questions.question) 
                        ? section.questions.question 
                        : [section.questions.question];
                }
            }
            
            console.log('Вопросы в секции:', questions);
            
            if (questions && questions.length > 0) {
                questions.forEach(question => {
                    const questionDiv = createQuestionElement(question);
                    sectionDiv.appendChild(questionDiv);
                });
            }
            
            content.appendChild(sectionDiv);
        });
    } else {
        // Если секций нет, показываем сообщение об ошибке
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Ошибка загрузки анкеты: не найдены разделы';
        errorDiv.style.display = 'block';
        content.appendChild(errorDiv);
        console.error('Не удалось найти секции в шаблоне:', template);
    }
}

// Создание элемента вопроса
function createQuestionElement(question) {
    console.log('Создание вопроса:', question);
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    
    const label = document.createElement('label');
    // xml2js оборачивает текстовые значения в массивы
    const questionText = Array.isArray(question.text) ? question.text[0] : question.text;
    label.textContent = questionText || 'Вопрос';
    console.log('Текст вопроса:', questionText);
    questionDiv.appendChild(label);
    
    const questionId = Array.isArray(question.id) ? question.id[0] : question.id || Math.random().toString(36).substr(2, 9);
    const fieldName = `q_${questionId}`;
    const questionType = Array.isArray(question.type) ? question.type[0] : question.type || 'text';
    
    console.log('ID вопроса:', questionId, 'Тип:', questionType);
    
    switch (questionType) {
        case 'text':
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.name = fieldName;
            textInput.id = fieldName;
            questionDiv.appendChild(textInput);
            break;
            
        case 'number':
            const numberInput = document.createElement('input');
            numberInput.type = 'number';
            numberInput.name = fieldName;
            numberInput.id = fieldName;
            if (question.step) {
                const stepValue = Array.isArray(question.step) ? question.step[0] : question.step;
                numberInput.step = stepValue;
            }
            questionDiv.appendChild(numberInput);
            break;
            
        case 'textarea':
            const textarea = document.createElement('textarea');
            textarea.name = fieldName;
            textarea.id = fieldName;
            questionDiv.appendChild(textarea);
            break;
            
        case 'select':
            const select = document.createElement('select');
            select.name = fieldName;
            select.id = fieldName;
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Выберите...';
            select.appendChild(defaultOption);
            
            // Обрабатываем опции
            let options = getQuestionOptions(question);
            console.log('Опции для select:', options);
            if (options && options.length > 0) {
                options.forEach(option => {
                    const optionEl = document.createElement('option');
                    const optionValue = Array.isArray(option.value) ? option.value[0] : option.value;
                    const optionText = Array.isArray(option.text) ? option.text[0] : option.text;
                    optionEl.value = optionValue || '';
                    optionEl.textContent = optionText || '';
                    select.appendChild(optionEl);
                });
            }
            questionDiv.appendChild(select);
            break;
            
        case 'radio':
            const radioGroup = document.createElement('div');
            radioGroup.className = 'radio-group';
            
            let radioOptions = getQuestionOptions(question);
            console.log('Опции для radio:', radioOptions);
            if (radioOptions && radioOptions.length > 0) {
                radioOptions.forEach(option => {
                    const radioItem = document.createElement('div');
                    radioItem.className = 'radio-item';
                    
                    const radioInput = document.createElement('input');
                    radioInput.type = 'radio';
                    radioInput.name = fieldName;
                    const optionValue = Array.isArray(option.value) ? option.value[0] : option.value || '';
                    radioInput.value = optionValue;
                    radioInput.id = `${fieldName}_${optionValue}`;
                    
                    const radioLabel = document.createElement('label');
                    radioLabel.htmlFor = radioInput.id;
                    const optionText = Array.isArray(option.text) ? option.text[0] : option.text || '';
                    radioLabel.textContent = optionText;
                    
                    radioItem.appendChild(radioInput);
                    radioItem.appendChild(radioLabel);
                    
                    const hasAdditionalText = Array.isArray(option.hasAdditionalText) 
                        ? option.hasAdditionalText[0] 
                        : option.hasAdditionalText;
                    
                    if (hasAdditionalText === 'true') {
                        const additionalDiv = document.createElement('div');
                        additionalDiv.className = 'additional-text';
                        additionalDiv.style.display = 'none';
                        
                        const additionalInput = document.createElement('input');
                        additionalInput.type = 'text';
                        additionalInput.name = `${fieldName}_additional`;
                        additionalInput.placeholder = 'Укажите...';
                        additionalInput.disabled = true;
                        
                        additionalDiv.appendChild(additionalInput);
                        radioItem.appendChild(additionalDiv);
                        
                        radioInput.addEventListener('change', function() {
                            if (this.checked) {
                                additionalDiv.style.display = 'block';
                                additionalInput.disabled = false;
                            } else {
                                additionalDiv.style.display = 'none';
                                additionalInput.disabled = true;
                                additionalInput.value = '';
                            }
                        });
                    }
                    
                    radioGroup.appendChild(radioItem);
                });
            }
            questionDiv.appendChild(radioGroup);
            break;
            
        case 'checkbox':
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            
            let checkboxOptions = getQuestionOptions(question);
            console.log('Опции для checkbox:', checkboxOptions);
            if (checkboxOptions && checkboxOptions.length > 0) {
                checkboxOptions.forEach(option => {
                    const checkboxItem = document.createElement('div');
                    checkboxItem.className = 'checkbox-item';
                    
                    const checkboxInput = document.createElement('input');
                    checkboxInput.type = 'checkbox';
                    checkboxInput.name = `${fieldName}[]`;
                    const optionValue = Array.isArray(option.value) ? option.value[0] : option.value || '';
                    checkboxInput.value = optionValue;
                    checkboxInput.id = `${fieldName}_${optionValue}`;
                    
                    const checkboxLabel = document.createElement('label');
                    checkboxLabel.htmlFor = checkboxInput.id;
                    const optionText = Array.isArray(option.text) ? option.text[0] : option.text || '';
                    checkboxLabel.textContent = optionText;
                    
                    checkboxItem.appendChild(checkboxInput);
                    checkboxItem.appendChild(checkboxLabel);
                    
                    const hasAdditionalText = Array.isArray(option.hasAdditionalText) 
                        ? option.hasAdditionalText[0] 
                        : option.hasAdditionalText;
                    
                    if (hasAdditionalText === 'true') {
                        const additionalDiv = document.createElement('div');
                        additionalDiv.className = 'additional-text';
                        additionalDiv.style.display = 'none';
                        
                        const additionalInput = document.createElement('input');
                        additionalInput.type = 'text';
                        additionalInput.name = `${fieldName}_${optionValue}_additional`;
                        additionalInput.placeholder = 'Укажите...';
                        additionalInput.disabled = true;
                        
                        additionalDiv.appendChild(additionalInput);
                        checkboxItem.appendChild(additionalDiv);
                        
                        checkboxInput.addEventListener('change', function() {
                            if (this.checked) {
                                additionalDiv.style.display = 'block';
                                additionalInput.disabled = false;
                            } else {
                                additionalDiv.style.display = 'none';
                                additionalInput.disabled = true;
                                additionalInput.value = '';
                            }
                        });
                    }
                    
                    checkboxGroup.appendChild(checkboxItem);
                });
            }
            questionDiv.appendChild(checkboxGroup);
            break;
            
        default:
            console.warn('Неизвестный тип вопроса:', questionType);
            const defaultInput = document.createElement('input');
            defaultInput.type = 'text';
            defaultInput.name = fieldName;
            defaultInput.id = fieldName;
            questionDiv.appendChild(defaultInput);
    }
    
    return questionDiv;
}

// Функция для получения опций вопроса
function getQuestionOptions(question) {
    console.log('Получение опций для вопроса:', question);
    console.log('question.options:', question.options);
    
    if (!question.options) return null;
    
    // xml2js всегда создает массивы
    if (Array.isArray(question.options)) {
        // Если options - это массив, берем первый элемент
        const optionsContainer = question.options[0];
        console.log('optionsContainer:', optionsContainer);
        
        if (optionsContainer && optionsContainer.option) {
            const options = Array.isArray(optionsContainer.option) 
                ? optionsContainer.option 
                : [optionsContainer.option];
            console.log('Найденные опции:', options);
            return options;
        }
    } else if (question.options.option) {
        const options = Array.isArray(question.options.option) 
            ? question.options.option 
            : [question.options.option];
        console.log('Найденные опции (прямые):', options);
        return options;
    }
    
    console.log('Опции не найдены');
    return null;
}

// Сохранение анкеты
document.getElementById('questionnaireForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const answers = {};
    
    // Собираем все ответы
    for (let [key, value] of formData.entries()) {
        if (key.endsWith('[]')) {
            const cleanKey = key.replace('[]', '');
            if (!answers[cleanKey]) {
                answers[cleanKey] = [];
            }
            answers[cleanKey].push(value);
        } else {
            answers[key] = value;
        }
    }
    
    console.log('Отправляемые ответы:', answers);
    
    try {
        const response = await fetch('/api/save-questionnaire', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                templateId: currentTemplate.id,
                answers: answers
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('questionnairePage').classList.add('hidden');
            document.getElementById('thanksPage').classList.remove('hidden');
        } else {
            alert('Ошибка сохранения анкеты');
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('Ошибка сохранения анкеты');
    }
});

// Загрузка сообщения благодарности
async function loadThanksMessage() {
    try {
        const response = await fetch('/api/thanks-message');
        const data = await response.json();
        document.getElementById('thanksMessage').textContent = data.message;
    } catch (error) {
        console.error('Ошибка загрузки сообщения:', error);
    }
}

// Обработка Enter в поле пароля
document.getElementById('patientPassword').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        authenticate();
    }
});