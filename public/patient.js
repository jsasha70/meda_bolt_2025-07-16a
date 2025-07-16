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
    
    title.textContent = template.questionnaire.title || 'Анкета';
    content.innerHTML = '';
    
    if (template.questionnaire.sections) {
        template.questionnaire.sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'section';
            
            const sectionTitle = document.createElement('h3');
            sectionTitle.textContent = section.title;
            sectionDiv.appendChild(sectionTitle);
            
            if (section.questions) {
                section.questions.forEach(question => {
                    const questionDiv = createQuestionElement(question);
                    sectionDiv.appendChild(questionDiv);
                });
            }
            
            content.appendChild(sectionDiv);
        });
    }
}

// Создание элемента вопроса
function createQuestionElement(question) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    
    const label = document.createElement('label');
    label.textContent = question.text;
    questionDiv.appendChild(label);
    
    const fieldName = `q_${question.id}`;
    
    switch (question.type) {
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
            if (question.step) numberInput.step = question.step;
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
            
            if (question.options) {
                question.options.forEach(option => {
                    const optionEl = document.createElement('option');
                    optionEl.value = option.value;
                    optionEl.textContent = option.text;
                    select.appendChild(optionEl);
                });
            }
            questionDiv.appendChild(select);
            break;
            
        case 'radio':
            const radioGroup = document.createElement('div');
            radioGroup.className = 'radio-group';
            
            if (question.options) {
                question.options.forEach(option => {
                    const radioItem = document.createElement('div');
                    radioItem.className = 'radio-item';
                    
                    const radioInput = document.createElement('input');
                    radioInput.type = 'radio';
                    radioInput.name = fieldName;
                    radioInput.value = option.value;
                    radioInput.id = `${fieldName}_${option.value}`;
                    
                    const radioLabel = document.createElement('label');
                    radioLabel.htmlFor = radioInput.id;
                    radioLabel.textContent = option.text;
                    
                    radioItem.appendChild(radioInput);
                    radioItem.appendChild(radioLabel);
                    
                    if (option.hasAdditionalText) {
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
            
            if (question.options) {
                question.options.forEach(option => {
                    const checkboxItem = document.createElement('div');
                    checkboxItem.className = 'checkbox-item';
                    
                    const checkboxInput = document.createElement('input');
                    checkboxInput.type = 'checkbox';
                    checkboxInput.name = `${fieldName}[]`;
                    checkboxInput.value = option.value;
                    checkboxInput.id = `${fieldName}_${option.value}`;
                    
                    const checkboxLabel = document.createElement('label');
                    checkboxLabel.htmlFor = checkboxInput.id;
                    checkboxLabel.textContent = option.text;
                    
                    checkboxItem.appendChild(checkboxInput);
                    checkboxItem.appendChild(checkboxLabel);
                    
                    if (option.hasAdditionalText) {
                        const additionalDiv = document.createElement('div');
                        additionalDiv.className = 'additional-text';
                        additionalDiv.style.display = 'none';
                        
                        const additionalInput = document.createElement('input');
                        additionalInput.type = 'text';
                        additionalInput.name = `${fieldName}_${option.value}_additional`;
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
    }
    
    return questionDiv;
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