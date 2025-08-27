import express from "express";
import axios from "axios";
import ejs from "ejs";
import he from "he";
import session from "express-session";

const app = express();
const port = 3000;
const url = "https://opentdb.com/api.php";

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(session ({
  secret: "trivia-secret",
  resave: false,
  saveUninitialized: true
}));

app.get("/", (req, res) => {
    res.render("index.ejs");
})

app.get("/quiz", async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    const response = await axios.get(url, {
      params: {
        amount: 10,
        category: category,
        difficulty: difficulty,
        type: "multiple",
      },
    });

    const questions = response.data.results.map(q => {

      const correctAnswer = he.decode(q.correct_answer);
      const wrongAnswers = q.incorrect_answers.map(a => he.decode(a));
      const answers = [...wrongAnswers, correctAnswer].sort(() => Math.random() - 0.5);

      return {
        question: he.decode(q.question),
        correctAnswer,
        answers
      };
    });

    req.session.quiz = {
      questions,
      currentIndex: 0,
      score: 0,
      answers: []
    };

    res.redirect("/question");

    } catch (error) {
      console.error("Get /quiz error: ", error.message);
      res.send("Something went wrong. Try again.");
    }
});

app.get("/question", (req, res) => {
  try {
    const quiz = req.session.quiz;
    if (!quiz) return res.redirect("/");

    if (quiz.currentIndex >= quiz.questions.length) {
      return res.redirect("/results");
    }

    const currentQuestion = quiz.questions[quiz.currentIndex];
    res.render("question.ejs", {
      question: currentQuestion.question,
      answers: currentQuestion.answers,
      index: quiz.currentIndex + 1,
      total: quiz.questions.length
    });

  } catch (error) {
    console.error("Get /question error: ", error.message);
    res.send("Something went wrong. Try again.");
  };
});

app.post("/answer", (req, res) => {
  try {
    const quiz = req.session.quiz;
    if (!quiz) return res.redirect("/");

    const { answer } = req.body;

    const currentQuestion = quiz.questions[quiz.currentIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;

    if (isCorrect) quiz.score ++;
    quiz.answers.push({
      question: currentQuestion.question,
      chosen: answer,
      correct: currentQuestion.correctAnswer,
      result: isCorrect
    });

    quiz.currentIndex++;
    res.redirect("/question");

  } catch (error) {
    console.error("Post /answer error: ", error.message);
    res.send("Something went wrong. Try again.");
  };
});

app.get("/results", (req, res) => {
  try {
    const quiz = req.session.quiz;
    if (!quiz) return res.redirect("/");

    res.render("results.ejs", {
      score: quiz.score,
      total: quiz.questions.length,
      answers: quiz.answers
    });
    
    req.session.quiz = null;

  } catch (error) {
    console.error("Get /results error: ", error.message);
    res.send("Something went wrong. Try again.");
  };
});

app.listen(port, (req, res) => {
    console.log(`Server has started on port ${port}.`);
});