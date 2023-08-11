document.addEventListener("DOMContentLoaded", () => {
    let correctWord, correctLetters, wrongGuessCount; // Declare correctWord variable outside of any function scope
    const socket = io();

    function handleAddToWordlistSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const word = form.elements.word.value;
        const hint = form.elements.hint.value;
        socket.emit('addToWordlist', { word, hint });
        form.reset();
    }

    const addToWordlistForm = document.getElementById('addToWordlistForm');
    addToWordlistForm.addEventListener('submit', handleAddToWordlistSubmit);


    function hangmanScripts(wordList) {
        const wordDisplay = document.querySelector(".word-display");
        const guessesText = document.querySelector(".guesses-text b");
        const keyboardDiv = document.querySelector(".keyboard");
        const hangmanImage = document.querySelector(".hangman-box img");
        const gameModal = document.querySelector(".game-modal");
        const playAgainBtn = gameModal.querySelector("button");
        const maxGuesses = 6;

        const resetGame = () => {
            // Resetting game variables and UI elements
            correctLetters = [];
            wrongGuessCount = 0;
            hangmanImage.src = "images/hangman-0.svg";
            guessesText.innerText = `${wrongGuessCount} / ${maxGuesses}`;
            wordDisplay.innerHTML = correctWord.split("").map(() => `<li class="letter"></li>`).join("");
            keyboardDiv.querySelectorAll("button").forEach(btn => (btn.disabled = false));
            gameModal.classList.remove("show");
        };


        const getRandomWord = () => {
            // Selecting a random word and hint from the wordList
            const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
            correctWord = randomWord.word; // Updated variable name
            document.querySelector(".hint-text b").innerText = randomWord.hint;
            resetGame();
        };

        const gameOver = (isVictory) => {
            // After game complete.. showing modal with relevant details
            const modalText = isVictory ? `You found the word:` : "The correct word was:";
            gameModal.querySelector("img").src = `images/${isVictory ? "victory" : "lost"}.gif`;
            gameModal.querySelector("h4").innerText = isVictory ? "Congrats!" : "Game Over!";
            gameModal.querySelector("p b").innerText = correctWord; // Display the correctWord
            gameModal.classList.add("show");
            socket.emit('gameOver', { isWin: isVictory });
        };

        const initGame = (button, clickedLetter) => {
            // Checking if clickedLetter exists in the correctWord
            if (correctWord.includes(clickedLetter)) { // Updated variable name
                // Showing all correct letters on the word display
                [...correctWord].forEach((letter, index) => { // Updated variable name
                    if (letter === clickedLetter) {
                        correctLetters.push(letter);
                        wordDisplay.querySelectorAll("li")[index].innerText = letter;
                        wordDisplay.querySelectorAll("li")[index].classList.add("guessed");
                    }
                });
            } else {
                // If clicked letter doesn't exist, update the wrongGuessCount and hangman image
                wrongGuessCount++;
                hangmanImage.src = `images/hangman-${wrongGuessCount}.svg`;
            }
            button.disabled = true; // Disabling the clicked button so the user can't click again
            guessesText.innerText = `${wrongGuessCount} / ${maxGuesses}`;
            // Call gameOver function if any of these conditions are met
            if (wrongGuessCount === maxGuesses) return gameOver(false);
            if (correctLetters.length === correctWord.length) return gameOver(true); // Updated variable name
        };


        // Creating keyboard buttons and adding event listeners
        for (let i = 97; i <= 122; i++) {
            const button = document.createElement("button");
            button.innerText = String.fromCharCode(i);
            keyboardDiv.appendChild(button);
            button.addEventListener("click", (e) => initGame(e.target, String.fromCharCode(i)));
        }

        getRandomWord();
        playAgainBtn.addEventListener("click", getRandomWord);
    }
    socket.on("connect", () => {
        fetch('/api/hangman/wordList')
            .then(response => response.json())
            .then(wordList => {
                hangmanScripts(wordList);
            })
            .catch(error => {
                console.error('Error fetching wordList:', error);
            });
    });
});
