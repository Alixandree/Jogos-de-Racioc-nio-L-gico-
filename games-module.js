// Módulo de Jogos
const GamesModule = (function() {
    // Inicializar módulo
    function init() {
        console.log('Inicializando módulo de Jogos...');
        console.log('Módulo de Jogos inicializado');
    }
    
    // Inicializar jogo específico
    function initGame(gameId) {
        switch(gameId) {
            case 'mathQuiz':
                initMathQuiz();
                break;
            case 'colorMatch':
                initColorMatch();
                break;
            case 'numberPuzzle':
                initNumberPuzzle();
                break;
        }
    }
    
    // ============ QUIZ MATEMÁTICO ============
    function initMathQuiz() {
        window.mathScore = 0;
        window.mathTimer = 60;
        
        const mathScoreElement = document.getElementById('mathScore');
        const mathTimerElement = document.getElementById('mathTimer');
        const mathFeedbackElement = document.getElementById('mathFeedback');
        
        if (mathScoreElement) mathScoreElement.textContent = window.mathScore;
        if (mathTimerElement) mathTimerElement.textContent = window.mathTimer;
        if (mathFeedbackElement) mathFeedbackElement.textContent = '';
        
        window.mathTimerInterval = setInterval(function() {
            window.mathTimer--;
            if (mathTimerElement) mathTimerElement.textContent = window.mathTimer;
            
            if (window.mathTimer <= 0) {
                clearInterval(window.mathTimerInterval);
                endMathGame();
            }
        }, 1000);
        
        loadMathQuestion();
    }
    
    function loadMathQuestion() {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operators = ['+', '-', '*'];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        
        let correctAnswer;
        let questionText;
        
        switch(operator) {
            case '+':
                correctAnswer = num1 + num2;
                questionText = `${num1} + ${num2} = ?`;
                break;
            case '-':
                correctAnswer = num1 - num2;
                questionText = `${num1} - ${num2} = ?`;
                break;
            case '*':
                correctAnswer = num1 * num2;
                questionText = `${num1} × ${num2} = ?`;
                break;
        }
        
        window.currentQuestion = {
            question: questionText,
            correctAnswer: correctAnswer,
            options: generateMathOptions(correctAnswer)
        };
        
        const mathQuestionElement = document.getElementById('mathQuestion');
        if (mathQuestionElement) mathQuestionElement.textContent = window.currentQuestion.question;
        
        const optionsContainer = document.getElementById('mathOptions');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        
        window.currentQuestion.options.forEach((option) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.textContent = option;
            optionElement.addEventListener('click', () => checkMathAnswer(option));
            optionsContainer.appendChild(optionElement);
        });
    }
    
    function generateMathOptions(correctAnswer) {
        const options = [correctAnswer];
        
        while (options.length < 4) {
            const offset = Math.floor(Math.random() * 5) + 1;
            const sign = Math.random() < 0.5 ? -1 : 1;
            const wrongAnswer = correctAnswer + (offset * sign);
            
            if (wrongAnswer !== correctAnswer && wrongAnswer > 0 && !options.includes(wrongAnswer)) {
                options.push(wrongAnswer);
            }
        }
        
        return shuffleArray(options);
    }
    
    function checkMathAnswer(selectedAnswer) {
        const options = document.querySelectorAll('#mathOptions .option');
        const feedbackElement = document.getElementById('mathFeedback');
        
        let correctOption = null;
        options.forEach(option => {
            if (parseInt(option.textContent) === window.currentQuestion.correctAnswer) {
                correctOption = option;
            }
        });
        
        options.forEach(option => {
            if (parseInt(option.textContent) === selectedAnswer) {
                if (selectedAnswer === window.currentQuestion.correctAnswer) {
                    option.classList.add('correct');
                    if (feedbackElement) feedbackElement.textContent = 'Correto! +10 pontos';
                    window.mathScore += 10;
                    const mathScoreElement = document.getElementById('mathScore');
                    if (mathScoreElement) mathScoreElement.textContent = window.mathScore;
                } else {
                    option.classList.add('wrong');
                    if (feedbackElement) feedbackElement.textContent = `Incorreto! A resposta correta é ${window.currentQuestion.correctAnswer}`;
                }
            }
        });
        
        if (correctOption && selectedAnswer !== window.currentQuestion.correctAnswer) {
            correctOption.classList.add('correct');
        }
        
        options.forEach(option => {
            option.style.pointerEvents = 'none';
        });
        
        setTimeout(() => {
            if (window.mathTimer > 0) {
                loadMathQuestion();
                if (feedbackElement) feedbackElement.textContent = '';
            }
        }, 1500);
    }
    
    function endMathGame() {
        const feedbackElement = document.getElementById('mathFeedback');
        if (feedbackElement) feedbackElement.textContent = `Fim do jogo! Sua pontuação final: ${window.mathScore}`;
        
        // Chama a função global do script principal
        if (typeof window.endMathGame === 'function') {
            window.endMathGame();
        } else {
            // Fallback se a função global não existir
            if (window.currentUser && window.mathScore > 0) {
                const scoreData = {
                    userId: window.currentUser.email,
                    userName: window.currentUser.name,
                    score: window.mathScore,
                    date: new Date().toISOString()
                };
                
                window.DB.addScore('math', scoreData);
                window.DB.updateUserStats(window.currentUser.email, 'math', window.mathScore);
                
                // Atualizar UI
                if (typeof window.AuthModule !== 'undefined' && typeof window.AuthModule.updateUI === 'function') {
                    window.AuthModule.updateUI();
                }
            }
        }
        
        const options = document.querySelectorAll('#mathOptions .option');
        options.forEach(option => {
            option.style.pointerEvents = 'none';
        });
    }
    
    // ============ COMBINADOR DE CORES ============
    function initColorMatch() {
        window.colorMoves = 0;
        window.colorPairs = 0;
        window.colorTime = 0;
        window.matchedPairs = 0;
        window.selectedColors = [];
        
        const colorMovesElement = document.getElementById('colorMoves');
        const colorPairsElement = document.getElementById('colorPairs');
        const colorFeedbackElement = document.getElementById('colorFeedback');
        const colorTimerElement = document.getElementById('colorTimer');
        
        if (colorMovesElement) colorMovesElement.textContent = window.colorMoves;
        if (colorPairsElement) colorPairsElement.textContent = `${window.colorPairs}/8`;
        if (colorFeedbackElement) colorFeedbackElement.textContent = 'Encontre os pares de cores iguais!';
        if (colorTimerElement) colorTimerElement.textContent = window.colorTime;
        
        window.colorTimerInterval = setInterval(function() {
            window.colorTime++;
            if (colorTimerElement) colorTimerElement.textContent = window.colorTime;
        }, 1000);
        
        const colorList = [
            '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
            '#118AB2', '#073B4C', '#EF476F', '#7209B7'
        ];
        
        window.colors = [...colorList, ...colorList];
        window.colors = shuffleArray(window.colors);
        
        const colorGrid = document.getElementById('colorGrid');
        if (!colorGrid) return;
        
        colorGrid.innerHTML = '';
        
        window.colors.forEach((color, index) => {
            const colorCell = document.createElement('div');
            colorCell.className = 'color-cell';
            colorCell.dataset.index = index;
            colorCell.dataset.color = color;
            colorCell.style.backgroundColor = '#2c3e50';
            
            colorCell.addEventListener('click', () => selectColorCell(colorCell));
            colorGrid.appendChild(colorCell);
        });
    }
    
    function selectColorCell(cell) {
        if (window.selectedColors.length >= 2 || cell.classList.contains('matched')) {
            return;
        }
        
        if (cell.classList.contains('selected')) {
            cell.classList.remove('selected');
            cell.style.backgroundColor = '#2c3e50';
            window.selectedColors = window.selectedColors.filter(item => item.index !== parseInt(cell.dataset.index));
            return;
        }
        
        cell.classList.add('selected');
        cell.style.backgroundColor = cell.dataset.color;
        window.selectedColors.push({
            index: parseInt(cell.dataset.index),
            color: cell.dataset.color,
            element: cell
        });
        
        if (window.selectedColors.length === 2) {
            window.colorMoves++;
            const colorMovesElement = document.getElementById('colorMoves');
            if (colorMovesElement) colorMovesElement.textContent = window.colorMoves;
            
            if (window.selectedColors[0].color === window.selectedColors[1].color) {
                setTimeout(() => {
                    window.selectedColors.forEach(item => {
                        item.element.classList.remove('selected');
                        item.element.classList.add('matched');
                        item.element.style.opacity = '0.5';
                        item.element.style.cursor = 'default';
                    });
                    
                    window.matchedPairs++;
                    window.colorPairs++;
                    const colorPairsElement = document.getElementById('colorPairs');
                    const colorFeedbackElement = document.getElementById('colorFeedback');
                    
                    if (colorPairsElement) colorPairsElement.textContent = `${window.colorPairs}/8`;
                    if (colorFeedbackElement) colorFeedbackElement.textContent = `Par encontrado! ${window.matchedPairs}/8 pares descobertos.`;
                    
                    window.selectedColors = [];
                    
                    if (window.matchedPairs === 8) {
                        endColorGame();
                    }
                }, 500);
            } else {
                setTimeout(() => {
                    window.selectedColors.forEach(item => {
                        item.element.classList.remove('selected');
                        item.element.style.backgroundColor = '#2c3e50';
                    });
                    
                    const colorFeedbackElement = document.getElementById('colorFeedback');
                    if (colorFeedbackElement) colorFeedbackElement.textContent = 'Tente novamente!';
                    window.selectedColors = [];
                }, 1000);
            }
        }
    }
    
    function endColorGame() {
        clearInterval(window.colorTimerInterval);
        const colorFeedbackElement = document.getElementById('colorFeedback');
        if (colorFeedbackElement) colorFeedbackElement.textContent = `Parabéns! Você completou o jogo em ${window.colorMoves} movimentos e ${window.colorTime} segundos!`;
        
        // Chama a função global do script principal
        if (typeof window.endColorGame === 'function') {
            window.endColorGame();
        } else {
            // Fallback se a função global não existir
            if (window.currentUser) {
                const scoreData = {
                    userId: window.currentUser.email,
                    userName: window.currentUser.name,
                    score: window.colorTime,
                    date: new Date().toISOString()
                };
                
                window.DB.addScore('color', scoreData);
                window.DB.updateUserStats(window.currentUser.email, 'color', window.colorTime);
                
                // Atualizar UI
                if (typeof window.AuthModule !== 'undefined' && typeof window.AuthModule.updateUI === 'function') {
                    window.AuthModule.updateUI();
                }
            }
        }
    }
    
    // ============ QUEBRA-CABEÇA NUMÉRICO ============
    function initNumberPuzzle() {
        window.puzzleMoves = 0;
        window.puzzleState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
        
        shufflePuzzle();
        
        const puzzleMovesElement = document.getElementById('puzzleMoves');
        const puzzleFeedbackElement = document.getElementById('puzzleFeedback');
        
        if (puzzleMovesElement) puzzleMovesElement.textContent = window.puzzleMoves;
        if (puzzleFeedbackElement) puzzleFeedbackElement.textContent = 'Organize os números em ordem crescente!';
        
        renderPuzzle();
    }
    
    function shufflePuzzle() {
        for (let i = 0; i < 100; i++) {
            const emptyIndex = window.puzzleState.indexOf(0);
            const possibleMoves = [];
            
            if (emptyIndex % 3 > 0) possibleMoves.push(emptyIndex - 1);
            if (emptyIndex % 3 < 2) possibleMoves.push(emptyIndex + 1);
            if (emptyIndex >= 3) possibleMoves.push(emptyIndex - 3);
            if (emptyIndex < 6) possibleMoves.push(emptyIndex + 3);
            
            const moveIndex = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            
            window.puzzleState[emptyIndex] = window.puzzleState[moveIndex];
            window.puzzleState[moveIndex] = 0;
        }
    }
    
    function renderPuzzle() {
        const puzzleGrid = document.getElementById('puzzleGrid');
        if (!puzzleGrid) return;
        
        puzzleGrid.innerHTML = '';
        
        window.puzzleState.forEach((number, index) => {
            const cell = document.createElement('div');
            cell.className = number === 0 ? 'puzzle-cell empty' : 'puzzle-cell';
            cell.textContent = number === 0 ? '' : number;
            cell.dataset.index = index;
            
            if (number !== 0) {
                cell.addEventListener('click', () => movePuzzleCell(index));
            }
            
            puzzleGrid.appendChild(cell);
        });
    }
    
    function movePuzzleCell(clickedIndex) {
        const emptyIndex = window.puzzleState.indexOf(0);
        
        const isAdjacent = 
            (Math.abs(clickedIndex - emptyIndex) === 1 && Math.floor(clickedIndex / 3) === Math.floor(emptyIndex / 3)) ||
            (Math.abs(clickedIndex - emptyIndex) === 3);
        
        if (isAdjacent) {
            window.puzzleState[emptyIndex] = window.puzzleState[clickedIndex];
            window.puzzleState[clickedIndex] = 0;
            
            window.puzzleMoves++;
            document.getElementById('puzzleMoves').textContent = window.puzzleMoves;
            
            renderPuzzle();
            
            if (isPuzzleSolved()) {
                endPuzzleGame();
            }
        }
    }
    
    function isPuzzleSolved() {
        for (let i = 0; i < 8; i++) {
            if (window.puzzleState[i] !== i + 1) {
                return false;
            }
        }
        return window.puzzleState[8] === 0;
    }
    
    function endPuzzleGame() {
        document.getElementById('puzzleFeedback').textContent = `Parabéns! Você resolveu o quebra-cabeça em ${window.puzzleMoves} movimentos!`;
        
        // Chama a função global do script principal
        if (typeof window.endPuzzleGame === 'function') {
            window.endPuzzleGame();
        } else {
            // Fallback se a função global não existir
            if (window.currentUser) {
                const scoreData = {
                    userId: window.currentUser.email,
                    userName: window.currentUser.name,
                    score: window.puzzleMoves,
                    date: new Date().toISOString()
                };
                
                window.DB.addScore('puzzle', scoreData);
                window.DB.updateUserStats(window.currentUser.email, 'puzzle', window.puzzleMoves);
                
                if (typeof window.AuthModule !== 'undefined' && typeof window.AuthModule.updateUI === 'function') {
                    window.AuthModule.updateUI();
                }
            }
        }
    }
    
    // Função utilitária para embaralhar arrays
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // Interface pública do módulo
    return {
        init: init,
        initGame: initGame,
        initMathQuiz: initMathQuiz,
        initColorMatch: initColorMatch,
        initNumberPuzzle: initNumberPuzzle,
        loadMathQuestion: loadMathQuestion,
        checkMathAnswer: checkMathAnswer,
        endMathGame: endMathGame,
        selectColorCell: selectColorCell,
        endColorGame: endColorGame,
        renderPuzzle: renderPuzzle,
        movePuzzleCell: movePuzzleCell,
        endPuzzleGame: endPuzzleGame,
        shuffleArray: shuffleArray
    };
})();