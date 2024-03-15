const express = require('express');
const bodyParser = require('body-parser');
const { Aki } = require('aki-api');
const mongoose = require('mongoose');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

function loadSessionData() { 
  try { 
    const data = fs.readFileSync('sessions.json', 'utf8'); 
    return JSON.parse(data); 
  } catch (error) { 
    console.error('Error loading session data:', error); 
    return {}; 
  } 
} 
function saveSessionData(data) { 
  try { 
    fs.writeFileSync('sessions.json', JSON.stringify(data), 'utf8'); 
  } catch (error) {
    console.error('Error saving session data:', error); 
  } 
}
let akiSessions = loadSessionData(); 
app.post('/akinator/create', async (req, res) => {
  const region = req.body.region || 'en';
  const childMode = req.body.childMode || false;
  const sessionId = new Date().getTime().toString();
  const proxy = undefined;

  try {
    const sessionExists = await akiSessions.hasOwnProperty(sessionId);

    if (sessionExists) {
      return res.status(400).json({ error: 'Session already exists' });
    }

    const aki = new Aki({ region, childMode, proxy });
    await aki.start();
    const session = { sessionId, aki, answered: false };
    akiSessions[sessionId] = session;
  saveSessionData(akiSessions); 


    const { question, answers, progress } = aki;

    let characterName = '';
    let characterRanking = '';
    let characterPseudo = '';
    let characterDescription ='';
    if (aki.currentStep >= 78) {
      const guess = aki.answers[0];
      characterName = guess.name || '';
      characterRanking = guess.ranking || '';
      characterPseudo = guess.pseudo || '';
      characterDescription = guess.description || '';
    }

    const response = {
      id: sessionId,
      question,
      answers,
      progress,
      characterName,
      characterRanking,
      characterPseudo,
      characterDescription
    };

    res.json(response);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.post('/akinator/answer', async (req, res) => {
  const sessionId = req.body.sessionId;
  const answer = req.body.answer;

  try {
    const session = akiSessions[sessionId];


    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.answered) {
      return res.json({ success: false, message: 'Question already answered' });
    }

    const { aki } = session;

    await aki.step(answer);

    session.answered = false;
    await saveSessionData(akiSessions);

    const { question, answers, progress } = aki;

    let characterName = '';
    let characterRanking = '';
    let characterPseudo = '';
    let characterDescription ='';
    if (aki.currentStep >= 78) {
      const guess = aki.answers[0];
      characterName = guess.name || '';
      characterRanking = guess.ranking || '';
      characterPseudo = guess.pseudo || '';
      characterDescription = guess.description || '';
    }

    const response = {
      id: sessionId,
      question,
      answers,
      progress,
      characterName,
      characterRanking,
      characterPseudo,
      characterDescription
    };
console.log(response)
    res.json(response);
  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});


app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

  
