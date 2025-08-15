# SorhyAI  
**Персональный ИИ-бот с характером.**  
Работает на базе Cypher Alpha.  
Отвечает естественно, запоминает контекст, не тупит.  

---

### Возможности:  
- 🧠 Естественный диалог  
- 🌍 Переводы и улучшения текста  
- 💬 Telegram-интерфейс  
- ⚙️ Кастомное ядро и память  

---

### TODO:  
- [ ] Голосовой вывод  
- [ ] Web-интерфейс  
- [ ] Собственное обучение  
- [ ] Мультимодальность  

---

**Автор:** Hanzo Dev  
> *"ИИ должен быть твоим, а не корпораций."*

---

### 📁 Проектная структура

```
SorhyAI_bot/
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── docs/
│   └── command-list-en.txt
├── logs/
│   └── sorhy-log.txt
├── src/
│   ├── index.js
│   ├── bot/
│   │   ├── config/
│   │   │   └── config.js
│   │   ├── handlers/
│   │   │   └── commandHandler.js
│   │   ├── localization/
│   │   │   ├── keys.js
│   │   │   └── localization.js
│   │   ├── prompt/
│   │   │   └── systemPrompt.js
│   │   └── services/
│   │       └── keyboardService.js
│   ├── core/
│   │   ├── database/
│   │   │   └── userManager.js
│   │   └── utils/
│   │       ├── errorHandler.js
│   │       └── logger.js
│   └── server/
│       ├── server.js
│       ├── public/
│       │   ├── assets/
│       │   │   └── SorhyAI logo.png
│       │   └── css/
│       │       └── style.css
│       ├── routes/
│       │   └── adminRoutes.js
│       └── views/
│           └── index.ejs
```
