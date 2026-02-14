from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
import requests
import json
import re
import html
import logging
from datetime import datetime
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import base64
from reportlab.lib.utils import ImageReader

# Настройка логирования и кодировки
import sys
import codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

load_dotenv()

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
CORS(app)

# Директория с HTML файлами
HTML_DIR = os.path.dirname(os.path.abspath(__file__))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"

def call_gemini_api(prompt, max_tokens=8000):
    """Вызов Gemini AI API с обработкой ошибок квоты"""
    if not GEMINI_API_KEY:
        print("❌ API ключ не найден")
        return None
    
    try:
        print("⏳ Вызов Gemini API...")
        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": max_tokens,
                }
            },
            timeout=90
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Ответ от Gemini API получен")
            
            try:
                if "candidates" in data and data["candidates"]:
                    candidate = data["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        if candidate["content"]["parts"]:
                            return candidate["content"]["parts"][0]["text"]
                return None
            except Exception as e:
                print(f"❌ Ошибка парсинга ответа: {e}")
                return None
        
        elif response.status_code == 429:
            error_data = response.json()
            print(f"\n⚠️ ПРЕВЫШЕНА КВОТА GEMINI API!")
            print(f"📊 Детали:")
            
            if "error" in error_data and "details" in error_data["error"]:
                for detail in error_data["error"]["details"]:
                    if detail.get("@type") == "type.googleapis.com/google.rpc.RetryInfo":
                        retry_delay = detail.get("retryDelay", "неизвестно")
                        print(f"⏰ Повторите попытку через: {retry_delay}")
            
            print(f"\n💡 РЕШЕНИЯ:")
            print(f"1. ⏳ Подождите несколько минут и попробуйте снова")
            print(f"2. 💳 Обновите план API в Google AI Studio: https://aistudio.google.com/app/apikey")
            print(f"3. 🔄 Используйте другой API ключ")
            print(f"4. 🤖 Переключитесь на Claude API (https://console.anthropic.com/)")
            return None
            
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Ошибка вызова Gemini API: {e}")
        return None

def extract_json_from_response(text):
    """Извлечение JSON из ответа ИИ с улучшенной обработкой"""
    if not text:
        return None
    
    # Убираем markdown код и HTML теги
    text = re.sub(r'```json\n?|```\n?', '', text).strip()
    
    # Ищем JSON объект
    start = text.find('{')
    if start == -1:
        print("No JSON found in response")
        return None
    
    balance = 0
    end = start
    
    for i in range(start, len(text)):
        char = text[i]
        if char == '{':
            balance += 1
        elif char == '}':
            balance -= 1
            if balance == 0:
                end = i + 1
                break
    
    json_str = text[start:end]
    
    try:
        data = json.loads(json_str)
        # Очищаем HTML теги из контента
        return clean_html_tags(data)
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        print(f"JSON string: {json_str}")
        return None

def clean_html_tags(data):
    """Рекурсивно очищает HTML теги из данных"""
    if isinstance(data, dict):
        return {key: clean_html_tags(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [clean_html_tags(item) for item in data]
    elif isinstance(data, str):
        # Экранируем HTML теги вместо их удаления
        cleaned = html.escape(data)
        # Восстанавливаем переносы строк
        cleaned = cleaned.replace('\\n', '\n')
        return cleaned
    else:
        return data

def generate_course_title(pdf_text):
    """Генерация названия курса"""
    prompt = f"""
Проанализируй текст и создай короткое название курса (до 50 символов).

ТЕКСТ:
{pdf_text[:2000]}

Верни ТОЛЬКО название, без кавычек.

Примеры: "Основы HTML и CSS", "Введение в Python"
"""
    
    title = call_gemini_api(prompt, max_tokens=100)
    if title:
        title = title.strip().strip('"').strip("'")
        return html.escape(title[:50])
    return None

def create_microlearning_prompt(pdf_text):
    """Промпт для создания микрообучения с улучшенными инструкциями"""
    return f"""
Создай микрообучение на основе материала.

ВАЖНЫЕ ИНСТРУКЦИИ:
- НЕ используй HTML теги в контенте
- Используй простой текст с переносами строк
- Для выделения используй *звездочки* или **двойные звездочки**
- Для кода используй обратные кавычки `

МАТЕРИАЛ:
{pdf_text[:8000]}

Структура:

1. ТЕОРИЯ - создай полную теорию из ВСЕГО материала файла, без ограничений по количеству уроков
   Каждая страница должна содержать 4-6 информативных абзацев

2. ФЛЕШКАРТЫ - 7-10 карточек с ОСНОВНЫМИ терминами и значениями

3. ТЕКСТОВЫЕ ЗАДАНИЯ - МИНИМУМ 15 вопросов РАЗНЫХ типов
   
   ⚠️ КРИТИЧЕСКИ ВАЖНО ДЛЯ multiple_choice:
   - КАЖДЫЙ вопрос типа "multiple_choice" ОБЯЗАТЕЛЬНО должен иметь массив "options"
   - В "options" СТРОГО 4 варианта ответа
   - Все 4 варианта должны быть разными и правдоподобными
   - "correct_answer" - это ИНДЕКС правильного ответа (0, 1, 2 или 3)
   - Если не можешь создать 4 варианта - используй тип "true_false"
   
   ОБЯЗАТЕЛЬНО используй ВСЕ типы вопросов:
   - multiple_choice (минимум 12 вопросов) - С МАССИВОМ OPTIONS ИЗ 4 ЭЛЕМЕНТОВ!
   - true_false (минимум 3 вопроса)

4. ПРАКТИЧЕСКИЕ ЗАДАНИЯ - 5-7 реальных задач
   КРИТИЧЕСКИ ВАЖНО: Определи тип курса по материалу!
   
   ЕСЛИ курс про ПРОГРАММИРОВАНИЕ (JavaScript, Python, HTML, CSS и тд):
   - Используй type: "code"
   - Давай задания на написание кода
   - Включай initialCode, solution, testCases, language
   
   ⚠️ ВАЖНО для initialCode в заданиях по программированию:
   - initialCode должен содержать ВСЁ необходимое: структуру HTML, теги, функции, переменные
   - Оставь ПУСТЫМ только то место, где студент должен дать ответ на конкретную задачу
   - Если задача "добавьте параграф с текстом" - предоставь готовый HTML с пустым местом только для <p></p>
   - Если задача "напишите функцию сложения" - предоставь готовую структуру файла с пустой функцией
   - Если задача "добавьте красный цвет заголовку" - предоставь готовый HTML+CSS с пустым свойством color
   - НЕ оставляй комментарии "ваш код здесь" - создавай конкретное пустое место под задачу
   
   Примеры ПРАВИЛЬНОГО initialCode:
   
   HTML - задача "добавьте параграф":
   initialCode: "<!DOCTYPE html>\\n<html>\\n<head>\\n    <title>Страница</title>\\n</head>\\n<body>\\n    <h1>Заголовок</h1>\\n    \\n</body>\\n</html>"
   
   Python - задача "функция сложения":
   initialCode: "def add(a, b):\\n    pass\\n\\nprint(add(2, 3))"
   
   CSS - задача "красный заголовок":
   initialCode: "<!DOCTYPE html>\\n<html>\\n<head>\\n    <style>\\n        h1 {{\\n            \\n        }}\\n    </style>\\n</head>\\n<body>\\n    <h1>Заголовок</h1>\\n</body>\\n</html>"
   
   ЕСЛИ курс НЕ про программирование (языки, биология, история, математика и тд):
   - Используй type: "practical"
   - Давай практические задания соответствующие предмету
   - Например для языков: составь диалог, переведи текст, найди ошибки
   - Для биологии: опиши процесс, классифицируй организмы
   - Для истории: проанализируй событие, сравни периоды
   - Для математики: реши задачу, построй график
   - НЕ включай поля для кода (initialCode, solution, testCases, language)
   - НЕ включай поля "example" и "hints" - студенты должны думать самостоятельно!
   - Включай только: type, task, instructions

JSON формат:

{{
  "theory": [
    {{
      "title": "Название страницы БЕЗ HTML тегов",
      "content": "Полный текст из материала файла. Используй *выделение* для важных моментов и `код` для примеров кода."
    }}
  ],
  "flashcards": [
    {{
      "front": "Основной термин БЕЗ HTML тегов",
      "back": "Краткое определение простыми словами БЕЗ HTML тегов"
    }}
  ],
  "textQuiz": [
    {{
      "type": "multiple_choice",
      "question": "Конкретный вопрос по материалу?",
      "options": [
        "Первый вариант ответа", 
        "Второй вариант ответа", 
        "Третий вариант ответа", 
        "Четвертый вариант ответа"
      ],
      "correct_answer": 0,
      "explanation": "Почему это правильный ответ"
    }},
    {{
      "type": "multiple_choice",
      "question": "Еще один вопрос?",
      "options": [
        "Вариант A", 
        "Вариант B", 
        "Вариант C", 
        "Вариант D"
      ],
      "correct_answer": 2,
      "explanation": "Объяснение правильного ответа"
    }},
    {{
      "type": "true_false",
      "question": "Это утверждение верно?",
      "correct_answer": true,
      "explanation": "Объяснение почему верно или неверно"
    }}
  ],
  "practicalQuiz": [
    {{
      "type": "code",
      "task": "Добавьте параграф с текстом 'Привет, мир!' после заголовка",
      "initialCode": "<!DOCTYPE html>\\n<html>\\n<head>\\n    <title>Моя страница</title>\\n</head>\\n<body>\\n    <h1>Заголовок</h1>\\n    \\n</body>\\n</html>",
      "solution": "<!DOCTYPE html>\\n<html>\\n<head>\\n    <title>Моя страница</title>\\n</head>\\n<body>\\n    <h1>Заголовок</h1>\\n    <p>Привет, мир!</p>\\n</body>\\n</html>",
      "testCases": ["Проверка наличия тега <p>"],
      "language": "html"
    }}
    ИЛИ для гуманитарных предметов:
    {{
      "type": "practical",
      "task": "Описание задания",
      "instructions": "Подробная инструкция что нужно сделать"
    }}
  ]
}}

КРИТИЧЕСКИЕ ТРЕБОВАНИЯ:

- НИКАКИХ HTML ТЕГОВ в текстовом контенте
- Все тексты должны быть экранированы
- Используй только простой текст с Markdown-подобным форматированием
- ОБЯЗАТЕЛЬНО определи тип курса и создай ПОДХОДЯЩИЕ практические задания
- Для программирования - задания на код, для гуманитарных - текстовые задания
- ⚠️ ДЛЯ ПРОГРАММИРОВАНИЯ: initialCode должен быть ПОЧТИ ГОТОВЫМ, с пустым местом только для ответа на задачу
- Студент не должен писать весь код с нуля - только конкретный ответ (тег, свойство, функцию)
- СОЗДАЙ ПОЛНУЮ ТЕОРИЮ ИЗ ВСЕГО МАТЕРИАЛА ФАЙЛА - без ограничения в 5 уроков
- Флешкарты должны содержать только ОСНОВНЫЕ термины и определения
- ТЕКСТОВЫЕ ЗАДАНИЯ: МИНИМУМ 10 ВОПРОСОВ! Не меньше!
- ⚠️ КАЖДЫЙ multiple_choice вопрос ДОЛЖЕН иметь 4 варианта ответа в массиве "options"
- Если не можешь придумать 4 варианта - используй тип "true_false"

Верни ТОЛЬКО валидный JSON!
"""

@app.route('/diagnostics')
@app.route('/diagnostics.html')
def diagnostics():
    """Страница диагностики AI"""
    try:
        return send_from_directory(HTML_DIR, 'diagnostics.html')
    except Exception as e:
        print(f"Ошибка загрузки diagnostics.html: {e}")
        return f"""
        <html>
            <body style="font-family: Arial; background: #667eea; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                    <h1>🔍 Диагностика - Ошибка</h1>
                    <p>diagnostics.html не найден в директории {HTML_DIR}</p>
                    <p>Ошибка: {str(e)}</p>
                </div>
            </body>
        </html>
        """, 404


@app.route('/')
@app.route('/ai-ustaz.html')
def index():
    """Главная страница"""
    try:
        return send_from_directory(HTML_DIR, 'ai-ustaz.html')
    except Exception as e:
        print(f"Ошибка загрузки ai-ustaz.html: {e}")
        print(f"Ищу файл в директории: {HTML_DIR}")
        return f"""
        <html>
            <body style="font-family: Arial; background: #667eea; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                    <h1>Ai-Ustaz - Ошибка</h1>
                    <p>ai-ustaz.html не найден. Убедитесь что файл находится в той же папке.</p>
                    <p style="font-size: 12px;">Ищу в директории: {HTML_DIR}</p>
                    <p>Ошибка: {str(e)}</p>
                </div>
            </body>
        </html>
        """, 404


@app.route('/course')
@app.route('/course.html')
def course():
    """Страница электронного курса"""
    try:
        return send_from_directory(HTML_DIR, 'course.html')
    except Exception as e:
        print(f"Ошибка загрузки course.html: {e}")
        return """
        <html>
            <body style="font-family: 'Nunito Sans', Arial; background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%); color: #2D3748; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 8px 32px rgba(53, 89, 213, 0.1);">
                    <h1 style="color: #3559D5;">Электронный курс</h1>
                    <p>Файл course.html не найден</p>
                    <a href="/" style="background: #3559D5; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none;">На главную</a>
                </div>
            </body>
        </html>
        """, 404


@app.route('/flashcards')
@app.route('/flashcards.html')
@app.route('/flashcards-page.html')
def flashcards_page():
    """Страница флеш-карт"""
    try:
        return send_from_directory(HTML_DIR, 'flashcards-page.html')
    except Exception as e:
        print(f"Ошибка загрузки flashcards-page.html: {e}")
        return """
        <html>
            <body style="font-family: 'Nunito Sans', Arial; background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%); color: #2D3748; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 8px 32px rgba(53, 89, 213, 0.1);">
                    <h1 style="color: #3559D5;">Флеш-карты</h1>
                    <p>Файл flashcards-page.html не найден</p>
                    <a href="/" style="background: #3559D5; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none;">На главную</a>
                </div>
            </body>
        </html>
        """, 404


@app.route("/quiz")
@app.route("/quiz.html")
@app.route("/quiz-generator.html")
def quiz_generator_page():
    """Страница генератора тестов"""
    try:
        return send_from_directory(HTML_DIR, "quiz-generator.html")
    except Exception as e:
        print(f"Ошибка загрузки quiz-generator.html: {e}")
        return """
        <html>
            <body style="font-family: 'Nunito Sans', Arial; background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%); color: #2D3748; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 8px 32px rgba(53, 89, 213, 0.1);">
                    <h1 style="color: #3559D5;">🎯 Генератор тестов</h1>
                    <p>Файл quiz-generator.html не найден</p>
                    <a href="/" style="background: #3559D5; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none;">На главную</a>
                </div>
            </body>
        </html>
        """, 404

@app.route('/api/generate-flashcards', methods=['POST'])
def generate_flashcards():
    """Генерация флеш-карт с помощью AI"""
    try:
        pdf_text = request.form.get('pdf_text', '')
        
        if not pdf_text:
            return jsonify({
                "success": False,
                "error": "Текст PDF не предоставлен"
            }), 400
        
        if not GEMINI_API_KEY:
            return jsonify({
                "success": False,
                "error": "API ключ Gemini не настроен"
            }), 500
        
        # Генерируем содержательное название на основе текста
        print("🎴 Анализ содержания для названия...")
        title_prompt = f"""
Проанализируй содержание этого текста и создай краткое информативное название для набора учебных карточек.

Текст для анализа:
{pdf_text[:4000]}

Требования к названию:
- Максимум 3-5 слов
- Отражает основную тему текста
- Будет понятно для учебных карточек
- Без кавычек и лишних символов
- На русском языке

Примеры хороших названий:
- Основы программирования на Python
- Ключевые термины молекулярной биологии  
- Важные даты Второй мировой войны
- Грамматика английского языка
- Основы экономической теории

Верни ТОЛЬКО название, без пояснений:"""
        
        title_response = call_gemini_api(title_prompt, max_tokens=150)
        
        if title_response:
            # Тщательно очищаем название
            flashcard_title = title_response.strip()
            # Убираем кавычки, точки и другие лишние символы
            flashcard_title = re.sub(r'^["\'\`]|["\'\`]$', '', flashcard_title)
            flashcard_title = re.sub(r'^[\.\-\s]+|[\.\-\s]+$', '', flashcard_title)
            # Убираем слова "название", "тема" и т.д. если они в начале
            flashcard_title = re.sub(r'^(Название|Тема|Тематика|Курс|Карточки|Флеш-карты)[:\s]*', '', flashcard_title, flags=re.IGNORECASE)
            flashcard_title = flashcard_title.strip()
            
            # Проверяем что название не пустое и достаточно длинное
            if not flashcard_title or len(flashcard_title) < 3:
                flashcard_title = generate_fallback_title(pdf_text)
            else:
                # Обрезаем до разумной длины
                flashcard_title = flashcard_title[:60].strip()
                print(f"✅ Название создано: '{flashcard_title}'")
        else:
            flashcard_title = generate_fallback_title(pdf_text)
            print(f"⚠️  Используем запасное название: '{flashcard_title}'")
        
        # Генерируем флеш-карты с учетом темы
        print("🎴 Генерация флеш-карт...")
        flashcards_prompt = f"""
На основе предоставленного текста создай 15 учебных флеш-карт по теме: "{flashcard_title}"

Текст:
{pdf_text[:10000]}

Создай карточки которые охватывают основные концепции, термины и идеи из текста.

Формат - ТОЛЬКО JSON массив:
[
  {{"front": "Вопрос или термин", "back": "Ответ или определение"}},
  {{"front": "Вопрос или термин", "back": "Ответ или определение"}}
]

Требования:
- Ровно 15 карточек
- Карточки должны быть связаны с темой: {flashcard_title}
- Front: краткий вопрос или термин
- Back: развернутый ответ или определение
- Используй только простой текст, без форматирования
- Избегай общих фраз, ориентируйся на конкретное содержание текста
- Карточки должны быть полезны для изучения материала

Верни ТОЛЬКО JSON массив:"""
        
        ai_response = call_gemini_api(flashcards_prompt, max_tokens=4000)
        
        if not ai_response:
            return jsonify({
                "success": False,
                "error": "AI не ответил на запрос флеш-карт"
            }), 500
        
        print(f"✅ Ответ AI получен")
        
        # Очищаем и парсим JSON
        cleaned_response = clean_ai_response(ai_response)
        flashcards = parse_flashcards_json(cleaned_response)
        
        # Если не удалось распарсить, создаем запасные карточки
        if not flashcards:
            print("⚠️  Создаем запасные карточки")
            flashcards = create_thematic_fallback_cards(pdf_text, flashcard_title)
        
        # Очищаем карточки от лишних символов
        cleaned_flashcards = clean_flashcards_data(flashcards)
        
        print(f"🎉 Флеш-карты готовы: {len(cleaned_flashcards)} шт, тема: '{flashcard_title}'")
        
        return jsonify({
            "success": True,
            "flashcards": cleaned_flashcards,
            "title": flashcard_title,
            "count": len(cleaned_flashcards)
        })
        
    except Exception as e:
        print(f"❌ Ошибка генерации флеш-карт: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Создаем базовые карточки даже при ошибке
        try:
            pdf_text = request.form.get('pdf_text', '')
            fallback_title = generate_fallback_title(pdf_text)
            fallback_cards = create_thematic_fallback_cards(pdf_text, fallback_title)
            return jsonify({
                "success": True,
                "flashcards": fallback_cards,
                "title": fallback_title,
                "count": len(fallback_cards),
                "note": "Созданы базовые карточки из-за ошибки AI"
            })
        except:
            return jsonify({
                "success": False,
                "error": f"Ошибка: {str(e)}"
            }), 500

def generate_fallback_title(text):
    """Создание запасного названия на основе текста"""
    # Ищем ключевые слова в тексте
    words = re.findall(r'\b[А-Яа-яA-Za-z]{5,}\b', text[:3000])
    
    # Считаем частоту слов
    from collections import Counter
    word_freq = Counter(words)
    
    # Берем 2-3 самых частых слова (исключая стоп-слова)
    stop_words = {'это', 'что', 'как', 'для', 'если', 'или', 'но', 'на', 'в', 'с', 'по', 'из', 'от'}
    top_words = [word for word, count in word_freq.most_common(10) 
                if word.lower() not in stop_words and len(word) > 3][:3]
    
    if top_words:
        title = " ".join(top_words)
        # Делаем первое слово с заглавной буквы
        title = title[0].upper() + title[1:] if title else "Учебные карточки"
    else:
        title = "Учебные карточки"
    
    return title[:50]

def clean_ai_response(response):
    """Очистка ответа AI"""
    if not response:
        return ""
    
    cleaned = response.strip()
    # Убираем markdown блоки
    cleaned = re.sub(r'```json\s*', '', cleaned)
    cleaned = re.sub(r'```\s*', '', cleaned)
    # Убираем лишние пробелы
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned

def parse_flashcards_json(response):
    """Парсинг JSON с флеш-картами"""
    import re
    import json
    
    if not response:
        return []
    
    # Ищем JSON массив
    json_match = re.search(r'\[\s*\{.*\}\s*\]', response, re.DOTALL)
    
    if json_match:
        try:
            json_str = json_match.group()
            flashcards = json.loads(json_str)
            if isinstance(flashcards, list) and len(flashcards) > 0:
                return flashcards
        except json.JSONDecodeError as e:
            print(f"❌ Ошибка парсинга JSON: {e}")
    
    return []

def clean_flashcards_data(flashcards):
    """Очистка данных флеш-карт"""
    cleaned = []
    
    for card in flashcards:
        if isinstance(card, dict) and 'front' in card and 'back' in card:
            front = str(card['front']).strip()
            back = str(card['back']).strip()
            
            # Очищаем от JSON символов и HTML
            front = re.sub(r'[\[\]{}"\'`]', '', front)
            back = re.sub(r'[\[\]{}"\'`]', '', back)
            front = re.sub(r'<[^>]+>', '', front)
            back = re.sub(r'<[^>]+>', '', back)
            
            # Убираем лишние пробелы
            front = re.sub(r'\s+', ' ', front).strip()
            back = re.sub(r'\s+', ' ', back).strip()
            
            if front and back and len(front) > 2 and len(back) > 2:
                cleaned.append({
                    'front': front[:200],
                    'back': back[:300]
                })
    
    return cleaned

def create_thematic_fallback_cards(text, title):
    """Создание тематических запасных карточек"""
    cards = []
    
    # Извлекаем предложения из текста
    sentences = re.split(r'[.!?]+', text[:2000])
    
    for i, sentence in enumerate(sentences[:15]):
        sentence = sentence.strip()
        if len(sentence) > 25:
            words = sentence.split()
            if len(words) > 4:
                # Создаем вопрос из первых слов
                front = ' '.join(words[:4]) + '...'
                back = sentence
                
                cards.append({
                    'front': front[:150],
                    'back': back[:250]
                })
    
    # Дополняем до 15 карточек
    while len(cards) < 15:
        cards.append({
            'front': f'Ключевой аспект {len(cards) + 1} темы',
            'back': f'Важный элемент изучения "{title}"'
        })
    
    return cards

@app.route('/api/generate-microlearning', methods=['POST'])
def generate_microlearning():
    """Генерация микрообучения"""
    try:
        data = request.get_json()
        pdf_text = data.get('pdf_text', '')
        pdf_name = data.get('pdf_name', 'document.pdf')
        
        if not pdf_text:
            return jsonify({
                "success": False, 
                "error": "PDF текст отсутствует"
            }), 400
        
        print(f"\n{'='*60}")
        print(f"📄 PDF: {pdf_name}")
        print(f"📊 Длина: {len(pdf_text)} символов")
        print(f"{'='*60}\n")
        
        if not GEMINI_API_KEY:
            return jsonify({
                "success": False,
                "error": "API ключ не настроен"
            }), 500
        
        print("🎯 Генерация названия...")
        course_title = generate_course_title(pdf_text)
        
        if not course_title:
            course_title = pdf_name.replace('.pdf', '')
            print(f"⚠️  Используем имя файла: {course_title}")
        else:
            print(f"✅ Название: {course_title}")
        
        print("\n📚 Генерация контента...")
        prompt = create_microlearning_prompt(pdf_text)
        ai_response = call_gemini_api(prompt, max_tokens=8000)
        
        if not ai_response:
            return jsonify({
                "success": False, 
                "error": "AI не ответил"
            }), 500
        
        print("✅ Ответ получен")
        
        microlearning_data = extract_json_from_response(ai_response)
        
        if not microlearning_data:
            print("❌ Ошибка парсинга JSON")
            return jsonify({
                "success": False, 
                "error": "Ошибка создания микрообучения"
            }), 500
        
        required_keys = ['theory', 'flashcards', 'textQuiz', 'practicalQuiz']
        missing_keys = [key for key in required_keys if key not in microlearning_data]
        
        if missing_keys:
            print(f"❌ Отсутствуют: {missing_keys}")
            return jsonify({
                "success": False, 
                "error": f"Отсутствуют компоненты: {', '.join(missing_keys)}"
            }), 500
        
        if not isinstance(microlearning_data['theory'], list):
            print("❌ Theory не массив")
            return jsonify({
                "success": False, 
                "error": "Неверный формат теории"
            }), 500
        
        # КРИТИЧЕСКИ ВАЖНО: Проверяем и исправляем вопросы с отсутствующими options
        fixed_questions = []
        removed_count = 0
        converted_count = 0
        
        for i, q in enumerate(microlearning_data['textQuiz']):
            # Проверяем multiple_choice вопросы
            if q.get('type') == 'multiple_choice':
                # Проверяем наличие options
                if 'options' not in q or not isinstance(q['options'], list) or len(q['options']) < 2:
                    # Пытаемся определить является ли это true/false вопросом
                    question_lower = q.get('question', '').lower()
                    is_true_false = any(word in question_lower for word in ['верно', 'правильно', 'является', 'true', 'false', 'да', 'нет'])
                    
                    if is_true_false and 'correct_answer' in q:
                        # Конвертируем в true_false
                        print(f"🔄 Вопрос {i+1}: конвертирован multiple_choice → true_false")
                        print(f"    Вопрос: {q.get('question', 'N/A')[:60]}...")
                        
                        # Определяем правильный ответ
                        correct = q['correct_answer']
                        if isinstance(correct, bool):
                            correct_bool = correct
                        elif isinstance(correct, int):
                            correct_bool = (correct == 0 or correct == 1) and (correct == 0)
                        elif isinstance(correct, str):
                            correct_bool = correct.lower() in ['true', 'верно', 'да', 'правильно']
                        else:
                            correct_bool = True
                        
                        # Создаём true_false вопрос
                        fixed_q = {
                            'type': 'true_false',
                            'question': q['question'],
                            'correctAnswer': correct_bool,
                            'explanation': q.get('explanation', '')
                        }
                        fixed_questions.append(fixed_q)
                        converted_count += 1
                        continue
                    else:
                        # Не можем исправить - удаляем
                        print(f"❌ Вопрос {i+1}: отсутствуют options и не является true/false, пропускаем")
                        print(f"    Вопрос: {q.get('question', 'N/A')[:60]}...")
                        removed_count += 1
                        continue
                
                # Проверяем что options содержит минимум 2 элемента
                if len(q['options']) < 2:
                    print(f"❌ Вопрос {i+1}: слишком мало вариантов ({len(q['options'])}), пропускаем")
                    removed_count += 1
                    continue
                
                # Исправляем correct_answer если это не индекс
                if 'correct_answer' in q:
                    if isinstance(q['correct_answer'], str):
                        # Если correct_answer строка, ищем её индекс в options
                        try:
                            q['correct_answer'] = q['options'].index(q['correct_answer'])
                        except ValueError:
                            # Если не нашли, ставим 0
                            q['correct_answer'] = 0
                            print(f"⚠️  Вопрос {i+1}: исправлен correct_answer на 0")
                    elif not isinstance(q['correct_answer'], int):
                        q['correct_answer'] = 0
                        print(f"⚠️  Вопрос {i+1}: correct_answer преобразован в int")
                    
                    # Проверяем что индекс в допустимых пределах
                    if q['correct_answer'] >= len(q['options']):
                        q['correct_answer'] = 0
                        print(f"⚠️  Вопрос {i+1}: correct_answer вне диапазона, исправлен на 0")
                
                # Переименовываем correct_answer в correctAnswer для совместимости
                if 'correct_answer' in q:
                    q['correctAnswer'] = q['correct_answer']
                
                fixed_questions.append(q)
            
            # Для true_false вопросов
            elif q.get('type') == 'true_false':
                if 'correct_answer' in q:
                    # Преобразуем в boolean
                    correct = q['correct_answer']
                    if isinstance(correct, str):
                        correct_bool = correct.lower() in ['true', 'верно', 'да', 'правильно', '1']
                    elif isinstance(correct, int):
                        correct_bool = correct == 1 or correct == 0 and correct != 0
                    else:
                        correct_bool = bool(correct)
                    
                    q['correctAnswer'] = correct_bool
                
                fixed_questions.append(q)
            
            
        if removed_count > 0:
            print(f"❌ Удалено {removed_count} вопросов без options")
        if converted_count > 0:
            print(f"🔄 Конвертировано {converted_count} вопросов в true_false")
        print(f"✅ Осталось {len(fixed_questions)} валидных вопросов")
        
        # Обновляем вопросы
        microlearning_data['textQuiz'] = fixed_questions
        
        # Проверяем что осталось достаточно вопросов
        if len(fixed_questions) < 5:
            print(f"❌ Слишком мало валидных вопросов: {len(fixed_questions)}")
            return jsonify({
                "success": False,
                "error": f"Создано только {len(fixed_questions)} валидных вопросов. Попробуйте загрузить PDF заново."
            }), 500
        
        print(f"\n✅ Создано:")
        print(f"   📖 Теория: {len(microlearning_data['theory'])} страниц")
        print(f"   🎴 Флешкарты: {len(microlearning_data['flashcards'])} шт")
        print(f"   📝 Текстовые: {len(microlearning_data['textQuiz'])} шт (после валидации)")
        print(f"   🎯 Практические: {len(microlearning_data['practicalQuiz'])} шт")
        print(f"{'='*60}\n")
        
        return jsonify({
            "success": True,
            "title": course_title,
            "microlearning": microlearning_data
        })
        
    except Exception as e:
        print(f"\n❌ Ошибка: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Ошибка сервера: {str(e)}"
        }), 500
@app.route('/api/check-practical-answer', methods=['POST'])
def check_practical_answer():
    """Проверка практического ответа через AI"""
    try:
        data = request.get_json()
        task = data.get('task', '')
        instructions = data.get('instructions', '')
        user_answer = data.get('user_answer', '')
        
        if not task or not user_answer:
            return jsonify({
                "success": False,
                "error": "Отсутствуют данные"
            }), 400
        
        if not GEMINI_API_KEY:
            return jsonify({
                "success": False,
                "error": "API ключ не настроен"
            }), 500
        
        # Создаем промпт для проверки
        prompt = f"""
Ты преподаватель, проверяющий ответ студента на практическое задание.

ЗАДАНИЕ:
{task}

ИНСТРУКЦИЯ:
{instructions}

ОТВЕТ СТУДЕНТА:
{user_answer}

ВАЖНЫЕ ПРАВИЛА ПРОВЕРКИ:
1. Оцени СОДЕРЖАНИЕ ответа, а не формулировки
2. Если ответ по смыслу правильный, но сформулирован иначе - считай правильным
3. Если не хватает деталей - укажи ЧЕГО именно не хватает
4. Если есть фактические ошибки - укажи КОНКРЕТНО какие
5. НИКОГДА не давай готовый правильный ответ
6. Давай конструктивные советы по улучшению

КРИТЕРИИ ОЦЕНКИ:
- Полнота ответа (все ли ключевые моменты раскрыты)
- Фактическая точность
- Логичность изложения
- Соответствие инструкциям

Верни JSON в формате:
{{
  "is_correct": true/false,
  "feedback": "Детальный отзыв с указанием сильных сторон и областей для улучшения"
}}

Примеры отзывов:

Если ОТВЕТ ПРАВИЛЬНЫЙ:
"Отлично! Ты правильно описал основные этапы клеточного дыхания и указал участвующие органеллы. Ответ полный и точный."

Если ОТВЕТ ЧАСТИЧНО ПРАВИЛЬНЫЙ:
"Ты верно указал основные этапы, но не упомянул роль митохондрий в процессе. Также стоит подробнее описать значение АТФ для клетки."

Если ОТВЕТ НЕПРАВИЛЬНЫЙ:
"В ответе есть неточности. Клеточное дыхание происходит в митохондриях, а не в ядре. Обрати внимание на этапы гликолиза, цикла Кребса и окислительного фосфорилирования."

Верни ТОЛЬКО валидный JSON!
"""
        
        ai_response = call_gemini_api(prompt, max_tokens=500)
        
        if not ai_response:
            return jsonify({
                "success": False,
                "error": "AI не ответил"
            }), 500
        
        # Извлекаем JSON из ответа
        result = extract_json_from_response(ai_response)
        
        if not result or 'is_correct' not in result or 'feedback' not in result:
            return jsonify({
                "success": False,
                "error": "Ошибка парсинга ответа AI"
            }), 500
        
        return jsonify({
            "success": True,
            "is_correct": result['is_correct'],
            "feedback": result['feedback']
        })
        
    except Exception as e:
        print(f"\n❌ Ошибка проверки ответа: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Ошибка сервера: {str(e)}"
        }), 500

@app.route('/api/generate-certificate', methods=['POST'])
def generate_certificate():
    """Генерация красивого сертификата о прохождении курса"""
    try:
        data = request.get_json()
        student_name = data.get('student_name', 'Слушатель')
        course_title = data.get('course_title', 'Курс')
        completion_date = data.get('completion_date', datetime.now().strftime('%d.%m.%Y'))
        language = data.get('language', 'ru')  # 'ru' или 'kz'
        
        if not student_name or not course_title:
            return jsonify({
                "success": False,
                "error": "Отсутствуют обязательные данные"
            }), 400
        
        # Создаем PDF в памяти
        buffer = io.BytesIO()
        
        # Размеры для ландшафтной ориентации
        page_width, page_height = landscape(A4)
        
        # Создаем canvas
        c = canvas.Canvas(buffer, pagesize=landscape(A4))
        
        # === ФОН СЕРТИФИКАТА ===
        # Градиентный фон
        c.setFillColor(HexColor('#F8FAFC'))
        c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
        
        # Декоративные элементы
        c.setFillColor(HexColor('#E3F2FD'))
        c.circle(100, 100, 80, fill=1, stroke=0)
        c.circle(page_width - 100, page_height - 100, 120, fill=1, stroke=0)
        c.circle(page_width - 200, 150, 60, fill=1, stroke=0)
        
        # === ЛОГОТИП ===
        try:
            # Пытаемся загрузить логотип
            if os.path.exists('logo.png'):
                logo = ImageReader('logo.png')
                # Рисуем логотип в левом верхнем углу
                c.drawImage(logo, 50, page_height - 120, width=80, height=80, preserveAspectRatio=True)
                # Также в правом верхнем углу для симметрии
                c.drawImage(logo, page_width - 130, page_height - 120, width=80, height=80, preserveAspectRatio=True)
        except Exception as e:
            print(f"Логотип не найден или ошибка загрузки: {e}")
        
        # === ЗАГОЛОВОК УНИВЕРСИТЕТА ===
        c.setFillColor(HexColor('#1E3A8A'))
        c.setFont('Helvetica-Bold', 20)
        
        if language == 'kz':
            university_name = "СӘРСЕН АМАНЖОЛОВ АТЫНДАҒЫ ШЫҒЫС ҚАЗАҚСТАН УНИВЕРСИТЕТІ"
        else:
            university_name = "ВОСТОЧНО-КАЗАХСТАНСКИЙ УНИВЕРСИТЕТ ИМЕНИ САРСЕНА АМАНЖОЛОВА"
        
        c.drawCentredString(page_width / 2, page_height - 80, university_name)
        
        # === НАДПИСЬ СЕРТИФИКАТ ===
        c.setFillColor(HexColor('#DC2626'))
        c.setFont('Helvetica-Bold', 36)
        c.drawCentredString(page_width / 2, page_height - 140, "СЕРТИФИКАТ")
        
        # === ОСНОВНОЙ ТЕКСТ ===
        c.setFillColor(HexColor('#374151'))
        c.setFont('Helvetica', 16)
        
        if language == 'kz':
            cert_text = "Осы сертификат"
        else:
            cert_text = "Настоящий сертификат подтверждает, что"
        
        c.drawCentredString(page_width / 2, page_height - 200, cert_text)
        
        # === ИМЯ СТУДЕНТА ===
        c.setFillColor(HexColor('#1E40AF'))
        c.setFont('Helvetica-Bold', 28)
        c.drawCentredString(page_width / 2, page_height - 260, student_name.upper())
        
        # === ТЕКСТ О КУРСЕ ===
        c.setFillColor(HexColor('#374151'))
        c.setFont('Helvetica', 16)
        
        if language == 'kz':
            course_text = f"«{course_title}» курсын аяқтап, оқыту бағдарламасында қарастырылған барлық материалдарды меңгергенін растайды."
        else:
            course_text = f"завершила курс «{course_title}» и освоила все предусмотренные учебной программой материалы."
        
        # Разбиваем длинный текст на строки
        text_lines = []
        words = course_text.split()
        current_line = ""
        
        for word in words:
            test_line = current_line + " " + word if current_line else word
            if len(test_line) <= 60:  # Максимальная длина строки
                current_line = test_line
            else:
                text_lines.append(current_line)
                current_line = word
        if current_line:
            text_lines.append(current_line)
        
        # Рисуем текст курса по строкам
        text_y = page_height - 320
        for line in text_lines:
            c.drawCentredString(page_width / 2, text_y, line)
            text_y -= 30
        
        # === ДАТА ===
        c.setFillColor(HexColor('#6B7280'))
        c.setFont('Helvetica', 14)
        c.drawCentredString(page_width / 2, text_y - 40, completion_date)
        
        # === ПОДПИСЬ РЕКТОРА (только одна по центру) ===
        signature_y = 120
        
        c.setFillColor(HexColor('#374151'))
        c.setFont('Helvetica', 12)
        
        # Линия для подписи
        c.drawCentredString(page_width / 2, signature_y, "_________________________")
        
        # Должность ректора
        if language == 'kz':
            rector_title = "Басқарма төрағасы-ректор, профессор Төлеген М.Ә."
        else:
            rector_title = "Председатель правления-ректор, профессор Төлеген М.Ә."
        
        c.drawCentredString(page_width / 2, signature_y - 20, rector_title)
        
        # === НОМЕР СЕРТИФИКАТА ===
        cert_number = f"№ {datetime.now().strftime('%Y%m%d')}-{hash(student_name) % 10000:04d}"
        c.setFillColor(HexColor('#9CA3AF'))
        c.setFont('Helvetica-Oblique', 10)
        c.drawRightString(page_width - 50, 50, cert_number)
        
        # === ДЕКОРАТИВНАЯ РАМКА ===
        c.setStrokeColor(HexColor('#E5E7EB'))
        c.setLineWidth(2)
        c.rect(20, 20, page_width - 40, page_height - 40, stroke=1, fill=0)
        
        # Сохраняем PDF
        c.showPage()
        c.save()
        
        buffer.seek(0)
        
        filename = f'Сертификат_{student_name}.pdf'.replace(' ', '_')
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Ошибка генерации сертификата: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Ошибка генерации сертификата: {str(e)}"
        }), 500


@app.route('/api/check-code', methods=['POST'])
def check_code():
    """Проверка кода студента с помощью ИИ"""
    try:
        data = request.get_json()
        user_code = data.get('user_code', '').strip()
        task = data.get('task', '')
        language = data.get('language', 'python')
        expected_output = data.get('expected_output', '')
        
        if not user_code:
            return jsonify({
                "success": False,
                "error": "Код не может быть пустым"
            }), 400
        
        # Формируем промпт для проверки кода
        check_prompt = f"""
Ты — опытный преподаватель программирования. Проверь код студента.

ЗАДАНИЕ:
{task}

КОД СТУДЕНТА:
```{language}
{user_code}
```

ОЖИДАЕМЫЙ РЕЗУЛЬТАТ (если указан):
{expected_output if expected_output else "Не указан"}

КРИТЕРИИ ПРОВЕРКИ:
1. Синтаксис - проверь на ошибки синтаксиса (незакрытые теги, скобки, кавычки)
2. Логика - выполняет ли код требования задания
3. Работоспособность - будет ли код работать корректно
4. Качество - читаемость, структура, best practices

ВАЖНО: 
- Если код ПОЛНОСТЬЮ правильный и работает - верни "correct": true
- Если есть ЛЮБЫЕ ошибки (синтаксис, логика, незакрытые теги) - верни "correct": false
- Обязательно проверь закрытие ВСЕХ тегов, скобок, кавычек
- При ошибках дай конкретные советы как исправить

Верни JSON:
{{
  "correct": true или false,
  "feedback": "Подробная обратная связь",
  "errors": ["список конкретных ошибок, если есть"],
  "suggestions": ["советы по улучшению"],
  "result_preview": "что выведет/покажет код (если правильный)"
}}

Отвечай ТОЛЬКО JSON, без дополнительного текста.
"""
        
        print(f"\n🔍 Проверка кода на {language}...")
        ai_response = call_gemini_api(check_prompt, max_tokens=2000)
        
        if not ai_response:
            return jsonify({
                "success": False,
                "error": "ИИ не смог проверить код. Попробуйте позже."
            }), 500
        
        # Извлекаем JSON из ответа
        result = extract_json_from_response(ai_response)
        
        if not result:
            return jsonify({
                "success": False,
                "error": "Не удалось обработать ответ ИИ"
            }), 500
        
        print(f"✅ Код проверен: {'Правильно' if result.get('correct') else 'Есть ошибки'}")
        
        return jsonify({
            "success": True,
            "result": result
        })
        
    except Exception as e:
        print(f"\n❌ Ошибка проверки кода: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Ошибка сервера: {str(e)}"
        }), 500

@app.route('/api/run-code', methods=['POST'])
def run_code():
    """Запуск кода студента (только для HTML/CSS/JavaScript)"""
    try:
        data = request.get_json()
        user_code = data.get('user_code', '').strip()
        language = data.get('language', 'html')
        
        if language not in ['html', 'css', 'javascript']:
            return jsonify({
                "success": False,
                "error": "Запуск поддерживается только для HTML/CSS/JavaScript"
            }), 400
        
        # Для HTML/CSS/JS просто возвращаем код для отображения во фрейме
        return jsonify({
            "success": True,
            "can_run": True,
            "code": user_code,
            "language": language
        })
        
    except Exception as e:
        print(f"\n❌ Ошибка запуска кода: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Ошибка сервера: {str(e)}"
        }), 500
@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    """Генерация тестовых заданий из загруженного файла"""
    try:
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "error": "Файл не загружен"
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "Файл не выбран"
            }), 400
        
        # Читаем содержимое файла
        file_content = file.read()
        
        # Определяем тип файла и извлекаем текст
        filename = file.filename.lower()
        
        if filename.endswith('.pdf'):
            # Для PDF используем простое извлечение текста
            try:
                import PyPDF2
                from io import BytesIO
                pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
                text_content = ""
                for page in pdf_reader.pages:
                    text_content += page.extract_text()
            except:
                # Если PyPDF2 не установлен, используем базовую обработку
                text_content = file_content.decode('utf-8', errors='ignore')
        elif filename.endswith('.txt'):
            text_content = file_content.decode('utf-8', errors='ignore')
        elif filename.endswith('.docx'):
            # Для DOCX используем базовое извлечение
            text_content = file_content.decode('utf-8', errors='ignore')
        else:
            return jsonify({
                "success": False,
                "error": "Неподдерживаемый формат файла"
            }), 400
        
        # Ограничиваем размер текста для AI
        text_content = text_content[:15000]
        
        print(f"\n📝 Генерация теста из файла: {file.filename}")
        print(f"   Размер текста: {len(text_content)} символов")
        
        # Генерируем тест через AI
        prompt = f"""
Проанализируй следующий материал и создай тестовое задание.

МАТЕРИАЛ:
{text_content}

ЗАДАНИЕ:
Создай минимум 15 РАЗНООБРАЗНЫХ тестовых вопросов РАЗНЫХ типов.

ТРЕБОВАНИЯ:
1. Вопросы должны охватывать ВСЕ основные темы из материала
2. МИНИМУМ 15 вопросов (можно больше, если материала много)
3. ОБЯЗАТЕЛЬНО используй ВСЕ следующие типы вопросов:
   - multiple_choice (минимум 5 вопросов с 4 вариантами ответа)
   - true_false (минимум 3 вопроса с вариантами Правда/Ложь)
   - matching (минимум 2 вопроса на сопоставление терминов)
   - fill_in_blank (минимум 2 вопроса с заполнением пропусков)
4. Для каждого типа используй соответствующий формат
5. Вопросы должны быть разного уровня сложности

ФОРМАТ ОТВЕТА (только JSON):
{{
    "title": "Название теста (на основе темы материала)",
    "questions": [
        {{
            "type": "multiple_choice",
            "question": "Текст вопроса?",
            "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"],
            "correctAnswer": 0,
            "explanation": "Объяснение правильного ответа"
        }},
        {{
            "type": "true_false",
            "question": "Утверждение для проверки?",
            "options": ["Правда", "Ложь"],
            "correctAnswer": 0,
            "explanation": "Объяснение"
        }}
    ]
}}

ВАЖНО: Верни ТОЛЬКО валидный JSON, без комментариев и markdown форматирования!
"""
        
        ai_response = call_gemini_api(prompt, max_tokens=8000)
        
        if not ai_response:
            return jsonify({
                "success": False,
                "error": "Не удалось сгенерировать тест через AI"
            }), 500
        
        # Извлекаем JSON из ответа
        quiz_data = extract_json_from_response(ai_response)
        
        if not quiz_data or 'questions' not in quiz_data:
            return jsonify({
                "success": False,
                "error": "Не удалось распознать формат ответа AI"
            }), 500
        
        # Проверяем минимальное количество вопросов
        if len(quiz_data['questions']) < 10:
            print(f"⚠️  Создано только {len(quiz_data['questions'])} вопросов (требуется минимум 10)")
        
        print(f"✅ Тест создан: {len(quiz_data['questions'])} вопросов")
        
        return jsonify({
            "success": True,
            "quiz": quiz_data
        })
        
    except Exception as e:
        print(f"\n❌ Ошибка генерации теста: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Ошибка сервера: {str(e)}"
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """Чат-бот с AI для ответов на вопросы пользователей"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({
                "success": False,
                "error": "Сообщение не может быть пустым"
            }), 400
        
        # Проверяем ключевые слова для быстрых ответов (без AI)
        lowerMessage = user_message.lower()
        
        # Быстрые ответы для навигации по платформе
        if any(word in lowerMessage for word in ['создать курс', 'создай курс', 'новый курс', 'сделать курс']):
            return jsonify({
                "success": True,
                "message": "Чтобы создать курс, нажмите на карточку **Электронный курс** на главной странице. Загрузите PDF-файл, и AI автоматически создаст полноценное микрообучение с теорией, тестами и практическими заданиями! 📚"
            })
        
        if any(word in lowerMessage for word in ['флеш-карт', 'флешкарт', 'карточки']):
            return jsonify({
                "success": True,
                "message": "Для создания флеш-карт нажмите на карточку **Флеш-карты** на главной странице. Это интерактивный метод запоминания - на одной стороне карточки термин, на другой определение! 🎴"
            })
        
        if any(word in lowerMessage for word in ['тест', 'задани']):
            return jsonify({
                "success": True,
                "message": "Для создания тестовых заданий нажмите на карточку **Тестовые задания**. AI поможет создать разнообразные вопросы с мгновенной обратной связью! ✅"
            })
        
        if any(word in lowerMessage for word in ['генератор', 'генерация', 'практическ']):
            return jsonify({
                "success": True,
                "message": "Нажмите на карточку **Генератор заданий** - AI создаст упражнения и задачи по любой теме за секунды! 💡"
            })
        
        if any(word in lowerMessage for word in ['план урока', 'учебный план']):
            return jsonify({
                "success": True,
                "message": "Для создания учебного плана урока нажмите на соответствующую карточку. Получите структурированный план с целями и этапами! 📝"
            })
        
        # Для всех остальных вопросов используем AI
        prompt = f"""Ты - дружелюбный AI-помощник образовательной платформы Ai-Ustaz для учителей и преподавателей.

Платформа Ai-Ustaz предоставляет следующие инструменты:
1. Флеш-карты - для запоминания терминов
2. Тестовые задания - для проверки знаний
3. Генератор заданий - AI создает упражнения
4. Учебный план урока - структурированные планы
5. Электронный курс - создание полных курсов из PDF
6. Анализ прогресса - статистика учеников
7. Банк ресурсов - библиотека материалов
8. Календарь занятий - планирование уроков
9. Интерактивные презентации - динамичные слайды
10. Проверка работ - автоматическая оценка
11. Геймификация - баллы и достижения
12. Видео-уроки - запись и монтаж
13. Домашние задания - создание ДЗ с дедлайнами

ВАЖНЫЕ ПРАВИЛА:
- Отвечай кратко и по делу (2-4 предложения)
- Используй дружелюбный, профессиональный тон
- Если вопрос про создание чего-то (курс, тест, карточки) - подскажи нажать на соответствующую карточку на главной странице
- Для общих вопросов давай полезную информацию
- Используй эмодзи умеренно (1-2 на сообщение)
- Не используй markdown форматирование жирным шрифтом (**)

Вопрос пользователя: {user_message}

Ответь коротко и полезно:"""
        
        print(f"\n💬 Чат-бот: Обработка вопроса...")
        ai_response = call_gemini_api(prompt, max_tokens=500)
        
        if not ai_response:
            return jsonify({
                "success": False,
                "error": "Не удалось получить ответ от AI. Попробуйте позже."
            }), 500
        
        # Очищаем ответ от лишних символов
        ai_response = ai_response.strip()
        
        print(f"✅ Ответ сгенерирован: {ai_response[:100]}...")
        
        return jsonify({
            "success": True,
            "message": ai_response
        })
        
    except Exception as e:
        print(f"\n❌ Ошибка в чат-боте: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Ошибка сервера: {str(e)}"
        }), 500
    
@app.route('/api/check-api', methods=['GET'])
def check_api():
    """Проверка API"""
    if GEMINI_API_KEY:
        test_response = call_gemini_api("Ответь одно слово: работает", max_tokens=10)
        return jsonify({
            "api_key_configured": True,
            "api_working": test_response is not None,
            "message": "API доступен" if test_response else "API не отвечает"
        })
    else:
        return jsonify({
            "api_key_configured": False,
            "api_working": False,
            "message": "API ключ не настроен"
        })

@app.route('/api/generate-assignments', methods=['POST'])
def generate_assignments():
    """Генерация практических и лабораторных заданий из PDF"""
    try:
        data = request.json
        pdf_text = data.get('pdf_text', '')
        pdf_name = data.get('pdf_name', 'document')
        assignment_type = data.get('assignment_type', 'practical')
        count = data.get('count', 5)
        level = data.get('level', 'medium')
        language = data.get('language', 'ru')
        
        if not pdf_text:
            return jsonify({
                "success": False,
                "error": "Текст не предоставлен"
            }), 400
        
        print(f"\n📝 Генерация заданий из {pdf_name}")
        print(f"   Тип: {assignment_type}")
        print(f"   Количество: {count}")
        print(f"   Уровень: {level}")
        print(f"   Язык: {language}")
        
        # Упрощенный промпт который ТОЧНО заставит AI выдать каждое задание отдельно
        if language == 'kk':
            prompt = f"""Материал негізінде {count} ЖЕКЕ тапсырма жасаңыз. 

Материал:
{pdf_text[:8000]}

МІНДЕТТІ ФОРМАТ - әрбір тапсырма НОМЕРМЕН басталуы керек:

ТАПСЫРМА 1: [атауы]
[толық сипаттама]

ТАПСЫРМА 2: [атауы]  
[толық сипаттама]

...

ТАПСЫРМА {count}: [атауы]
[толық сипаттама]

Әрбір тапсырма үшін:
- Нақты атау беріңіз
- Не істеу керектігін жазыңыз
- Қалай орындауды түсіндіріңіз
- Қандай нәтиже болуы керектігін көрсетіңіз

МІНДЕТТІ: Дәл {count} тапсырма болуы керек! Әрқайсысы "ТАПСЫРМА X:" деп басталуы керек!"""
        else:
            prompt = f"""Создайте {count} ОТДЕЛЬНЫХ заданий на основе материала.

Материал:
{pdf_text[:8000]}

ОБЯЗАТЕЛЬНЫЙ ФОРМАТ - каждое задание должно начинаться с НОМЕРА:

ЗАДАНИЕ 1: [название]
[полное описание]

ЗАДАНИЕ 2: [название]
[полное описание]

...

ЗАДАНИЕ {count}: [название]
[полное описание]

Для каждого задания:
- Дайте конкретное название
- Напишите что нужно сделать
- Объясните как выполнять
- Укажите какой результат должен получиться

ОБЯЗАТЕЛЬНО: Должно быть ровно {count} заданий! Каждое начинается с "ЗАДАНИЕ X:"!"""
        
        # Вызываем AI
        response_text = call_gemini_api(prompt, max_tokens=6000)
        
        if not response_text:
            return jsonify({
                "success": False,
                "error": "AI не вернул ответ"
            }), 500
        
        print(f"📄 Получен ответ от AI (длина: {len(response_text)})")
        print(f"📄 Первые 500 символов: {response_text[:500]}")
        
        # Парсим ответ по паттерну "ЗАДАНИЕ N:"
        import re
        
        if language == 'kk':
            # Ищем задания по паттерну "ТАПСЫРМА N:"
            pattern = r'ТАПСЫРМА\s+(\d+):\s*(.+?)(?=ТАПСЫРМА\s+\d+:|$)'
            title_prefix = "Тапсырма"
        else:
            # Ищем задания по паттерну "ЗАДАНИЕ N:"
            pattern = r'ЗАДАНИЕ\s+(\d+):\s*(.+?)(?=ЗАДАНИЕ\s+\d+:|$)'
            title_prefix = "Задание"
        
        matches = re.findall(pattern, response_text, re.DOTALL | re.IGNORECASE)
        
        print(f"🔍 Найдено совпадений: {len(matches)}")
        
        assignments_data = []
        
        if matches:
            for num, content in matches[:count]:
                content = content.strip()
                
                # Разделяем первую строку (название) и остальное (описание)
                lines = content.split('\n', 1)
                if len(lines) >= 2:
                    title_text = lines[0].strip()
                    description = lines[1].strip()
                else:
                    title_text = content[:100]  # Первые 100 символов как название
                    description = content
                
                # Очищаем название от лишних символов
                title_text = re.sub(r'^[:\-\*\#]+\s*', '', title_text)
                
                assignments_data.append({
                    "title": f"{title_prefix} {num}: {title_text}",
                    "description": description
                })
        
        # Если не нашли по паттерну, пробуем разбить по двойным переносам
        if not assignments_data:
            print("⚠️ Паттерн не сработал, разбиваем по абзацам")
            
            # Убираем возможные заголовки в начале
            clean_text = re.sub(r'^.*?(?=\n\n)', '', response_text, count=1, flags=re.DOTALL)
            
            paragraphs = [p.strip() for p in clean_text.split('\n\n') if p.strip() and len(p.strip()) > 100]
            
            for i, paragraph in enumerate(paragraphs[:count], 1):
                lines = paragraph.split('\n', 1)
                if len(lines) >= 2:
                    title_text = lines[0].strip()
                    description = lines[1].strip()
                else:
                    title_text = paragraph[:80]
                    description = paragraph
                
                # Очищаем от номеров и символов
                title_text = re.sub(r'^\d+[\.\)]\s*', '', title_text)
                title_text = re.sub(r'^[:\-\*\#]+\s*', '', title_text)
                
                assignments_data.append({
                    "title": f"{title_prefix} {i}: {title_text}",
                    "description": description
                })
        
        # Если всё ещё пусто, делим весь текст на примерно равные части
        if not assignments_data:
            print("⚠️ Разбиваем текст на равные части")
            
            lines = [l for l in response_text.split('\n') if l.strip()]
            chunk_size = len(lines) // count
            
            for i in range(count):
                start = i * chunk_size
                end = start + chunk_size if i < count - 1 else len(lines)
                chunk_lines = lines[start:end]
                
                if chunk_lines:
                    title_text = chunk_lines[0][:80]
                    description = '\n'.join(chunk_lines)
                    
                    assignments_data.append({
                        "title": f"{title_prefix} {i+1}: {title_text}",
                        "description": description
                    })
        
        if not assignments_data:
            return jsonify({
                "success": False,
                "error": "Не удалось извлечь задания из ответа AI"
            }), 500
        
        print(f"✅ Создано заданий: {len(assignments_data)}")
        for i, a in enumerate(assignments_data, 1):
            print(f"   {i}. {a['title'][:60]}...")
        
        return jsonify({
            "success": True,
            "assignments": assignments_data,
            "count": len(assignments_data)
        })
        
    except Exception as e:
        print(f"❌ Ошибка генерации заданий: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Ошибка: {str(e)}"
        }), 500
@app.route('/assignments-generator')
@app.route('/assignments-generator.html')
def assignments_generator_page():
    """Страница генератора практических заданий"""
    try:
        return send_from_directory(HTML_DIR, 'assignments-generator.html')
    except Exception as e:
        print(f"Ошибка загрузки assignments-generator.html: {e}")
        print(f"Ищу файл в директории: {HTML_DIR}")
        return """
        <html>
            <body style="font-family: 'Nunito Sans', Arial; background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%); color: #2D3748; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 8px 32px rgba(53, 89, 213, 0.1);">
                    <h1 style="color: #3559D5;">Генератор заданий</h1>
                    <p>Файл assignments-generator.html не найден</p>
                    <p style="font-size: 12px; color: #666;">Ищу в директории: """ + HTML_DIR + """</p>
                    <a href="/" style="background: #3559D5; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none;">На главную</a>
                </div>
            </body>
        </html>
        """, 404

@app.route('/library')
@app.route('/library.html')
def library_page():
    """Страница библиотеки сохранённых материалов"""
    try:
        return send_from_directory(HTML_DIR, 'library.html')
    except Exception as e:
        print(f"Ошибка загрузки library.html: {e}")
        print(f"Ищу файл в директории: {HTML_DIR}")
        return """
        <html>
            <body style="font-family: 'Nunito Sans', Arial; background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%); color: #2D3748; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center; background: white; padding: 50px; border-radius: 20px; box-shadow: 0 8px 32px rgba(53, 89, 213, 0.1);">
                    <h1 style="color: #3559D5;">📚 Библиотека</h1>
                    <p>Файл library.html не найден</p>
                    <p style="font-size: 12px; color: #666;">Ищу в директории: """ + HTML_DIR + """</p>
                    <a href="/" style="background: #3559D5; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none;">На главную</a>
                </div>
            </body>
        </html>
        """, 404


@app.route('/.well-known/appspecific/com.chrome.devtools.json')
def chrome_devtools_config():
    """Конфигурация для Chrome DevTools"""
    return jsonify({"message": "Not found"}), 404

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🎓 Ai-Ustaz: AI Платформа для учителей")
    print("="*60)
    print(f"📁 HTML директория: {HTML_DIR}")
    print(f"🔑 API: {'✅ Настроен' if GEMINI_API_KEY else '❌ Отсутствует'}")
    
    # Список всех необходимых HTML файлов
    html_files = [
        'ai-ustaz.html',
        'assignments-generator.html',
        'quiz-generator.html',
        'flashcards-page.html',
        'course.html',
        'library.html'
    ]
    
    print("\n📄 Проверка HTML файлов:")
    for html_file in html_files:
        file_path = os.path.join(HTML_DIR, html_file)
        if os.path.exists(file_path):
            print(f"   ✅ {html_file}")
        else:
            print(f"   ❌ {html_file} - НЕ НАЙДЕН!")
    
    # Проверяем наличие логотипа
    logo_path = os.path.join(HTML_DIR, 'logo.png')
    if os.path.exists(logo_path):
        print("   ✅ logo.png")
    else:
        print("   ⚠️  logo.png - сертификат будет без логотипа")
    
    if not GEMINI_API_KEY:
        print("\n⚠️  Создайте .env файл с содержимым:")
        print("   GEMINI_API_KEY=ваш_ключ_здесь")
        print("   Получить ключ: https://makersuite.google.com/app/apikey")
    
    print("\n📍 Сервер запущен на:")
    print("   → http://localhost:5000/ (главная)")
    print("   → http://localhost:5000/library (библиотека)")
    print("   → http://localhost:5000/assignments-generator")
    print("   → http://localhost:5000/quiz-generator")
    print("   → http://localhost:5000/flashcards-page")
    print("   → http://localhost:5000/course")
    print("="*60 + "\n")
    
    app.run(host="0.0.0.0", port=5000, debug=False)



@app.route('/api/generate-practical-assignments', methods=['POST'])
def generate_practical_assignments():
    """Генерация практических заданий на основе материала"""
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        
        if not prompt:
            return jsonify({
                "success": False,
                "error": "Промпт не может быть пустым"
            }), 400
        
        print("\n📝 Генерация практических заданий...")
        ai_response = call_gemini_api(prompt, max_tokens=8000)
        
        if not ai_response:
            return jsonify({
                "success": False,
                "error": "Не удалось сгенерировать задания"
            }), 500
        
        # Извлекаем JSON
        assignments_data = extract_json_from_response(ai_response)
        
        if not assignments_data or 'assignments' not in assignments_data:
            # Возвращаем демо-данные при ошибке
            return jsonify({
                "success": True,
                "assignments": [
                    {
                        "id": 1,
                        "title": "Базовое упражнение",
                        "description": "Практикуйтесь в основных концепциях",
                        "difficulty": "easy",
                        "objectives": ["Освоить базовые навыки"],
                        "instructions": "Выполните упражнение согласно инструкциям",
                        "expectedOutput": "Получить понимание основных концепций",
                        "hints": ["Начните с простого"],
                        "estimatedTime": "30 минут"
                    }
                ]
            })
        
        print(f"✅ Создано {len(assignments_data.get('assignments', []))} практических заданий")
        
        return jsonify({
            "success": True,
            "assignments": assignments_data.get('assignments', [])
        })
        
    except Exception as e:
        print(f"❌ Ошибка генерации практических заданий: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Ошибка: {str(e)}"
        }), 500


@app.route('/api/generate-laboratory-assignments', methods=['POST'])
def generate_laboratory_assignments():
    """Генерация лабораторных работ на основе материала"""
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        
        if not prompt:
            return jsonify({
                "success": False,
                "error": "Промпт не может быть пустым"
            }), 400
        
        print("\n🔬 Генерация лабораторных работ...")
        ai_response = call_gemini_api(prompt, max_tokens=10000)
        
        if not ai_response:
            return jsonify({
                "success": False,
                "error": "Не удалось сгенерировать лабораторные работы"
            }), 500
        
        # Извлекаем JSON
        laboratory_data = extract_json_from_response(ai_response)
        
        if not laboratory_data or 'laboratories' not in laboratory_data:
            # Возвращаем демо-данные
            return jsonify({
                "success": True,
                "laboratories": [
                    {
                        "id": 1,
                        "title": "Лабораторная работа 1",
                        "objective": "Изучить основные принципы",
                        "hypothesis": "Проверка гипотезы...",
                        "duration": "2 часа",
                        "materials": ["Материал 1", "Материал 2"],
                        "procedures": [
                            {"step": 1, "description": "Подготовка", "details": "Подготовьте рабочее место"}
                        ],
                        "expectedResults": "Ожидаемые результаты",
                        "rubric": {"criteria": [], "totalPoints": 25}
                    }
                ]
            })
        
        print(f"✅ Создано {len(laboratory_data.get('laboratories', []))} лабораторных работ")
        
        return jsonify({
            "success": True,
            "laboratories": laboratory_data.get('laboratories', [])
        })
        
    except Exception as e:
        print(f"❌ Ошибка генерации лабораторных работ: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Ошибка: {str(e)}"
        }), 500


@app.route('/api/extract-course-info', methods=['POST'])
def extract_course_info():
    """Определение информации о курсе из материала"""
    try:
        data = request.get_json()
        content = data.get('content', '')
        
        if not content:
            return jsonify({
                "success": False,
                "error": "Контент не может быть пустым"
            }), 400
        
        prompt = f"""
Проанализируй материал курса и определи:
1. Название курса/темы
2. Тип курса
3. Уровень курса (начинающий, средний, продвинутый)
4. Основные темы/модули
5. Целевая аудитория

МАТЕРИАЛ:
{content[:3000]}

Верни ТОЛЬКО валидный JSON (без комментариев):
{{
    "courseName": "название",
    "courseType": "тип курса",
    "level": "уровень",
    "mainTopics": ["тема 1", "тема 2"],
    "targetAudience": "аудитория"
}}
"""
        
        print("\n📚 Анализ информации о курсе...")
        ai_response = call_gemini_api(prompt, max_tokens=500)
        
        if not ai_response:
            return jsonify({
                "success": False,
                "error": "Не удалось определить информацию о курсе"
            }), 500
        
        course_info = extract_json_from_response(ai_response)
        
        if not course_info:
            course_info = {
                "courseName": "Неизвестный курс",
                "courseType": "Общий",
                "level": "средний",
                "mainTopics": [],
                "targetAudience": "студенты"
            }
        
        print(f"✅ Информация о курсе: {course_info.get('courseName', 'Unknown')}")
        
        return jsonify({
            "success": True,
            "courseInfo": course_info
        })
        
    except Exception as e:
        print(f"❌ Ошибка анализа информации о курсе: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Ошибка: {str(e)}"
        }), 500


# ============================================================================
# УСОВЕРШЕНСТВОВАННЫЕ ПРОМПТЫ ДЛЯ ИИ
# ============================================================================

def create_practical_assignment_prompt(content, count, include_code, include_hints):
    """Промпт для генерации практических заданий"""
    return f"""
Создай РОВНО {count} практических заданий на основе следующего материала.

СТРОГИЕ ТРЕБОВАНИЯ:
1. Каждое задание должно быть ПРАКТИЧЕСКИМ УПРАЖНЕНИЕМ (не тестом, не вопросом)
2. Разные уровни сложности: easy, medium, hard
3. Каждое задание должно иметь ЧЕТКУЮ ЦЕЛЬ и КОНКРЕТНЫЙ РЕЗУЛЬТАТ
4. Используй примеры из реальной жизни
{'5. Включи примеры кода и готовые шаблоны для работы' if include_code else ''}
{'6. Добавь практические подсказки для выполнения' if include_hints else ''}

ФОРМАТ КАЖДОГО ЗАДАНИЯ:
- ID (уникальный номер)
- Название (привлекательное, описывает суть)
- Описание (1-2 предложения)
- Сложность (easy/medium/hard)
- Цели обучения (2-3 цели)
- Пошаговые инструкции
- Ожидаемый результат
- Временные затраты на выполнение

МАТЕРИАЛ КУРСА:
{content[:5000]}

Верни ТОЛЬКО валидный JSON без markdown, комментариев или объяснений:
{{
    "assignments": [
        {{
            "id": 1,
            "title": "название задания",
            "description": "краткое описание",
            "difficulty": "easy",
            "objectives": ["цель 1", "цель 2", "цель 3"],
            "instructions": "1. Шаг первый...\\n2. Шаг второй...\\n3. Шаг третий...",
            "expectedOutput": "что должно получиться в результате",
            "hints": ["подсказка 1", "подсказка 2"],
            "codeTemplate": "// шаблон если требуется",
            "estimatedTime": "30 минут",
            "keywords": ["ключевое слово 1", "ключевое слово 2"]
        }}
    ]
}}

Повтори эту структуру ровно {count} раз с разными заданиями!
ВАЖНО: Возвращай ТОЛЬКО JSON, без всего остального!
"""


def create_laboratory_assignment_prompt(content, count, include_rubric, include_references):
    """Промпт для генерации лабораторных работ"""
    return f"""
Создай РОВНО {count} лабораторных работ на основе материала.

КАЖДАЯ ЛАБОРАТОРНАЯ РАБОТА ДОЛЖНА СОДЕРЖАТЬ:
1. Четкую цель и гипотезу
2. Список необходимых материалов
3. Пошаговую процедуру (минимум 5 шагов)
4. Ожидаемые результаты
5. Методику наблюдения и анализа
{'6. Детальную рубрику оценивания (критерии и баллы)' if include_rubric else ''}
{'7. Ссылки на дополнительные материалы и источники' if include_references else ''}

СТРУКТУРА ЛАБОРАТОРНОЙ РАБОТЫ:
- Название (описывает суть исследования)
- Цель (что нужно достичь)
- Гипотеза (что предполагаем проверить)
- Длительность (в часах)
- Материалы (список всего необходимого)
- Процедура (пошагово, с деталями)
- Ожидаемые результаты
- Критерии оценки

МАТЕРИАЛ КУРСА:
{content[:5000]}

Верни ТОЛЬКО валидный JSON без markdown, комментариев или объяснений:
{{
    "laboratories": [
        {{
            "id": 1,
            "title": "Лабораторная работа: название",
            "objective": "Основная цель работы",
            "hypothesis": "Проверяемая гипотеза",
            "duration": "2 часа",
            "materials": ["материал 1", "материал 2", "материал 3"],
            "procedures": [
                {{"step": 1, "description": "первый шаг", "details": "подробное описание"}},
                {{"step": 2, "description": "второй шаг", "details": "подробное описание"}}
            ],
            "expectedResults": "Что должно получиться",
            "observations": "Что нужно наблюдать и записывать",
            "analysis": "Как анализировать полученные данные",
            "conclusions": "На какие вопросы ответить в выводах",
            "rubric": {{
                "criteria": [
                    {{"name": "Подготовка", "points": 5, "description": "правильная подготовка"}},
                    {{"name": "Процедура", "points": 10, "description": "точное следование"}}
                ],
                "totalPoints": 25
            }},
            "references": ["источник 1", "источник 2"]
        }}
    ]
}}

Повтори эту структуру ровно {count} раз!
ВАЖНО: Возвращай ТОЛЬКО JSON, без всего остального!
"""

      

@app.route('/api/generate-theory', methods=['POST'])
def generate_theory():
    """Генерация теории с ИИ на основе содержания файла"""
    try:
        data = request.get_json()
        content = data.get('content', '')
        page_number = data.get('pageNumber', 1)
        total_pages = data.get('totalPages', 1)
        
        if not content:
            return jsonify({
                "success": False,
                "error": "Контент не может быть пустым"
            }), 400
        
        prompt = f"""
Ты — опытный преподаватель, создающий интересный учебный материал для начинающих.

Твоя задача: на основе предоставленного материала создать увлекательную теорию для страницы {page_number} из {total_pages}.

МАТЕРИАЛ:
{content[:8000]}

КРИТИЧЕСКИ ВАЖНЫЕ ТРЕБОВАНИЯ К ОФОРМЛЕНИЮ:

1. 📚 СТРУКТУРА С ЭМОДЗИ-ИКОНКАМИ:
   - Каждый основной раздел начинай с заголовка ## [эмодзи] Название раздела
   - Подразделы начинай с ### [эмодзи] Название подраздела
   
   Примеры эмодзи для разделов:
   📖 Основы | 🎯 Цель | 💡 Ключевая идея | 🔧 Инструменты | ⚡ Важно
   🌐 Применение | 🎨 Оформление | 🔥 Практика | 🚀 Продвинутый уровень
   ⭐ Совет | 🎓 Запомни | 📊 Статистика | 🏆 Результат | 🔍 Детали

2. ✨ ВЫДЕЛЕНИЕ КЛЮЧЕВЫХ ТЕРМИНОВ:
   - Оборачивай КАЖДЫЙ ключевой термин в **двойные звездочки**
   - Выдели 5-7 важнейших терминов на странице
   - Пример: **HTML** - это язык разметки
   - Пример: В **браузере** отображается результат

3. 💬 ОБЪЯСНЕНИЯ "ДЛЯ ЧАЙНИКОВ":
   - Используй простые аналогии из жизни
   - Сравнивай с бытовыми вещами
   - Избегай сложных технических терминов без объяснения
   - Пиши так, будто объясняешь другу

4. 📦 СПЕЦИАЛЬНЫЕ БЛОКИ (используй ключевые слова):
   - "Простыми словами:" - для простых объяснений
   - "Важно:" - для критичной информации
   - "Совет:" - для полезных рекомендаций  
   - "Пример:" - для практических примеров

5. 🎨 СТИЛЬ ИЗЛОЖЕНИЯ:
   - Разговорный, дружелюбный тон
   - Короткие абзацы (2-4 предложения)
   - Конкретные примеры после каждой концепции
   - Постепенное усложнение материала

ПРИМЕР ПРАВИЛЬНОГО ОФОРМЛЕНИЯ:

## 📖 Что такое HTML?

**HTML** (HyperText Markup Language) - это **язык разметки**, который используется для создания веб-страниц. 

Простыми словами: HTML - это как скелет человека. Он определяет структуру: где голова, где туловище, где ноги. Точно так же HTML определяет, где на странице будет заголовок, где текст, где картинка.

### 💡 Главная идея

**Браузер** (Chrome, Firefox, Safari) читает HTML-код и превращает его в красивую страницу, которую вы видите. Это как строитель, который читает чертеж и строит дом.

Важно: HTML отвечает только за **структуру**. За красоту отвечает CSS, за интерактивность - JavaScript.

Пример: Когда вы пишете `<h1>Привет!</h1>`, браузер понимает: это **заголовок первого уровня** - самый важный текст на странице.

## 🔧 Основные элементы

**Тег** - это команда для браузера, заключенная в угловые скобки `< >`. Большинство тегов парные: есть **открывающий тег** и **закрывающий тег**.

Совет: Всегда закрывайте теги! Открыли `<p>` - закройте `</p>`.

ВАЖНО:
- НЕ используй HTML теги в самом контенте (они есть только в примерах кода)
- Используй только markdown-разметку (##, ###, **, *)
- Текст должен быть чистым, без <div>, <p>, <span> и других HTML тегов
- Для кода используй тройные обратные кавычки ```

Верни текст теории в формате markdown с эмодзи и выделением терминов.
НЕ используй JSON, только текст markdown!
"""
        

        
        print(f"\n🎓 Генерация теории (страница {page_number}/{total_pages})...")
        ai_response = call_gemini_api(prompt, max_tokens=3000)
        
        if not ai_response:
            return jsonify({
                "success": False,
                "error": "Не удалось сгенерировать теорию"
            }), 500
        
        print(f"✅ Теория успешно сгенерирована")
        
        return jsonify({
            "success": True,
            "theory": ai_response.strip()
        })
        
    except Exception as e:
        print(f"❌ Ошибка генерации теории: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Ошибка: {str(e)}"
        }), 500


@app.route('/api/diagnostics', methods=['GET'])
def run_diagnostics():
    """🔍 Диагностика работы AI генерации"""
    results = {
        "timestamp": datetime.now().isoformat(),
        "api_key_present": False,
        "models_tested": [],
        "working_models": [],
        "errors": []
    }
    
    # Проверка 1: Наличие API ключа
    if not GEMINI_API_KEY:
        results["errors"].append("❌ API ключ Gemini не найден в .env файле")
        return jsonify(results), 500
    
    results["api_key_present"] = True
    results["api_key_length"] = len(GEMINI_API_KEY)
    
    # Список моделей для тестирования
    models_to_test = [
        "gemini-2.5-flash",
        "gemini-2.5-pro", 
        "gemini-2.0-flash",
        "gemini-2.0-flash-001",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-lite-001"
    ]
    
    test_prompt = "Напиши одно слово: 'Работает'"
    
    # Проверка 2: Тестирование моделей
    for model_name in models_to_test:
        model_result = {
            "model": model_name,
            "status": "unknown",
            "response_time": 0,
            "error": None
        }
        
        try:
            print(f"🧪 Тестирование модели: {model_name}")
            start_time = datetime.now()
            
            api_url = f"https://generativelanguage.googleapis.com/v1/models/{model_name}:generateContent"
            
            response = requests.post(
                f"{api_url}?key={GEMINI_API_KEY}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": test_prompt}]}],
                    "generationConfig": {
                        "temperature": 0.1,
                        "maxOutputTokens": 50,
                    }
                },
                timeout=30
            )
            
            response_time = (datetime.now() - start_time).total_seconds()
            model_result["response_time"] = round(response_time, 2)
            
            if response.status_code == 200:
                data = response.json()
                if "candidates" in data and data["candidates"]:
                    model_result["status"] = "✅ Работает"
                    model_result["response"] = data["candidates"][0]["content"]["parts"][0]["text"][:100]
                    results["working_models"].append(model_name)
                    print(f"  ✅ {model_name} - работает ({response_time:.2f}s)")
                else:
                    model_result["status"] = "⚠️ Пустой ответ"
                    model_result["error"] = "Нет данных в ответе"
                    print(f"  ⚠️ {model_name} - пустой ответ")
            
            elif response.status_code == 404:
                model_result["status"] = "❌ Не найдена"
                model_result["error"] = "Модель не существует или недоступна"
                print(f"  ❌ {model_name} - не найдена")
            
            elif response.status_code == 429:
                model_result["status"] = "⚠️ Лимит превышен"
                model_result["error"] = "Превышена квота API"
                print(f"  ⚠️ {model_name} - лимит превышен")
            
            elif response.status_code == 403:
                model_result["status"] = "❌ Доступ запрещен"
                model_result["error"] = "Проверьте API ключ или права доступа"
                print(f"  ❌ {model_name} - доступ запрещен")
            
            else:
                model_result["status"] = f"❌ Ошибка {response.status_code}"
                model_result["error"] = response.text[:200]
                print(f"  ❌ {model_name} - код ошибки {response.status_code}")
        
        except requests.Timeout:
            model_result["status"] = "⏱️ Таймаут"
            model_result["error"] = "Превышено время ожидания (30 сек)"
            print(f"  ⏱️ {model_name} - таймаут")
        
        except Exception as e:
            model_result["status"] = "❌ Ошибка"
            model_result["error"] = str(e)
            print(f"  ❌ {model_name} - ошибка: {e}")
        
        results["models_tested"].append(model_result)
    
    # Итоговые рекомендации
    if results["working_models"]:
        results["recommendation"] = f"✅ Рекомендуется использовать: {results['working_models'][0]}"
        results["success"] = True
    else:
        results["recommendation"] = "❌ Ни одна модель не работает. Проверьте API ключ и квоты."
        results["success"] = False
    
    print(f"\n📊 Диагностика завершена. Рабочих моделей: {len(results['working_models'])}")
    
    return jsonify(results)


if __name__ == '__main__':
    # Читаем порт из .env (у вас там указан 8000)
    port = int(os.getenv("PORT", 8000))
    # host='0.0.0.0' обязателен для работы на виртуальной машине
    app.run(host='0.0.0.0', port=port)