document.addEventListener("DOMContentLoaded", () => {
    let correctWord, correctLetters, wrongGuessCount;
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
            correctLetters = [];
            wrongGuessCount = 0;
            hangmanImage.src = "images/hangman-0.svg";
            guessesText.innerText = `${wrongGuessCount} / ${maxGuesses}`;
            wordDisplay.innerHTML = correctWord.split("").map(() => `<li class="letter"></li>`).join("");
            keyboardDiv.querySelectorAll("button").forEach(btn => (btn.disabled = false));
            gameModal.classList.remove("show");
        };


        const getRandomWord = () => {
            const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
            correctWord = randomWord.word;
            document.querySelector(".hint-text b").innerText = randomWord.hint;
            resetGame();
        };

        const gameOver = (isVictory) => {
            const modalText = isVictory ? `You found the word:` : "The correct word was:";
            gameModal.querySelector("img").src = `images/${isVictory ? "victory" : "lost"}.gif`;
            gameModal.querySelector("h4").innerText = isVictory ? "Congrats!" : "Game Over!";
            gameModal.querySelector("p b").innerText = correctWord; // viser correctWord
            gameModal.classList.add("show");
            socket.emit('gameOver', { isWin: isVictory });
        };

        const initGame = (button, clickedLetter) => {
            if (correctWord.includes(clickedLetter)) { 
                [...correctWord].forEach((letter, index) => { 
                    if (letter === clickedLetter) {
                        correctLetters.push(letter);
                        wordDisplay.querySelectorAll("li")[index].innerText = letter;
                        wordDisplay.querySelectorAll("li")[index].classList.add("guessed");
                    }
                });
            } else {
                wrongGuessCount++;
                hangmanImage.src = `images/hangman-${wrongGuessCount}.svg`;
            }
            button.disabled = true; //undgår at man kan trykke flere gange på samme bogstav
            guessesText.innerText = `${wrongGuessCount} / ${maxGuesses}`;
    
            if (wrongGuessCount === maxGuesses) return gameOver(false);
            if (correctLetters.length === correctWord.length) return gameOver(true); 
        };


        
        for (let i = 97; i <= 122; i++) {
            //bruger bogstavers ASCII 
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

            socket.on("updateUserStatistics", (hangmanRecords) => {
                const totalGames = hangmanRecords.length;
                const wins = hangmanRecords.filter(record => record.isWin).length;
                const losses = totalGames - wins;
                const winPercentage = (wins / totalGames) * 100;
        
                
                document.getElementById("totalGames").innerText = totalGames;
                document.getElementById("wins").innerText = wins;
                document.getElementById("losses").innerText = losses;
                document.getElementById("winPercentage").innerText = winPercentage.toFixed(2) + "%";
            });
    });
});
