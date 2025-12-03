// Sistema de Banco de Dados (mantido no principal pois é usado por todos os módulos)
const DB = {
    // Inicializar banco de dados
    init: function() {
        try {
            if (!localStorage.getItem('users')) {
                localStorage.setItem('users', JSON.stringify([]));
            }
            if (!localStorage.getItem('scores')) {
                localStorage.setItem('scores', JSON.stringify({
                    math: [],
                    color: [],
                    puzzle: []
                }));
            }
            if (!localStorage.getItem('currentUser')) {
                localStorage.setItem('currentUser', JSON.stringify(null));
            }
            
            // Verificar integridade dos dados
            this.validateDataIntegrity();
            
            console.log('✅ Banco de dados inicializado');
            return true;
        } catch (error) {
            console.error('❌ Erro no banco de dados:', error);
            // Reset seguro
            try {
                localStorage.clear();
                return this.init(); // Tentar novamente
            } catch (e) {
                console.error('❌ Não foi possível resetar o banco de dados');
                return false;
            }
        }
    },
    
    // Validar integridade dos dados
    validateDataIntegrity: function() {
        try {
            JSON.parse(localStorage.getItem('users'));
            JSON.parse(localStorage.getItem('scores'));
            JSON.parse(localStorage.getItem('currentUser'));
        } catch (error) {
            throw new Error('Dados corrompidos no localStorage');
        }
    },
    
    // Obter todos os usuários
    getUsers: function() {
        return JSON.parse(localStorage.getItem('users'));
    },
    
    // Salvar usuários
    saveUsers: function(users) {
        localStorage.setItem('users', JSON.stringify(users));
    },
    
    // Obter pontuações
    getScores: function() {
        return JSON.parse(localStorage.getItem('scores'));
    },
    
    // Salvar pontuações
    saveScores: function(scores) {
        localStorage.setItem('scores', JSON.stringify(scores));
    },
    
    // Adicionar nova pontuação
    addScore: function(game, scoreData) {
        const scores = this.getScores();
        scores[game].push(scoreData);
        
        // Ordenar por pontuação (maior primeiro) ou tempo/movimentos (menor primeiro)
        if (game === 'math') {
            scores[game].sort((a, b) => b.score - a.score);
        } else {
            scores[game].sort((a, b) => a.score - b.score);
        }
        
        // Manter apenas as top 50 pontuações
        scores[game] = scores[game].slice(0, 50);
        
        this.saveScores(scores);
    },
    
    // Registrar novo usuário
    registerUser: function(userData) {
        const users = this.getUsers();
        
        // Validar email
        if (!SecurityUtils.validateEmail(userData.email)) {
            return { success: false, message: 'Email inválido!' };
        }
        
        // Validar força da senha
        const passwordCheck = SecurityUtils.checkPasswordStrength(userData.password);
        if (!passwordCheck.strong) {
            return { success: false, message: passwordCheck.message };
        }
        
        // Verificar se email já existe
        if (users.some(user => user.email === userData.email)) {
            return { success: false, message: 'Este email já está cadastrado!' };
        }
        
        // Adicionar data de criação
        userData.createdAt = new Date().toISOString();
        userData.stats = {
            math: { bestScore: 0 },
            color: { bestTime: null },
            puzzle: { bestMoves: null }
        };
        
        // Ofuscar senha
        userData.password = SecurityUtils.encodePassword(userData.password);
        
        users.push(userData);
        this.saveUsers(users);
        
        return { 
            success: true, 
            message: 'Cadastro realizado com sucesso!',
            user: { name: userData.name, email: userData.email }
        };
    },
    
    // Login de usuário
    loginUser: function(email, password) {
        const users = this.getUsers();
        const encodedPassword = SecurityUtils.encodePassword(password);
        const user = users.find(u => u.email === email && u.password === encodedPassword);
        
        if (user) {
            // Remover a senha do objeto antes de salvar na sessão
            const { password, ...userWithoutPassword } = user;
            localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
            return { success: true, user: userWithoutPassword };
        } else {
            return { success: false, message: 'Email ou senha incorretos!' };
        }
    },
    
    // Logout de usuário
    logoutUser: function() {
        localStorage.setItem('currentUser', JSON.stringify(null));
    },
    
    // Obter usuário atual
    getCurrentUser: function() {
        return JSON.parse(localStorage.getItem('currentUser'));
    },
    
    // Atualizar estatísticas do usuário
    updateUserStats: function(userId, game, newScore) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.email === userId);
        
        if (userIndex !== -1) {
            const user = users[userIndex];
            
            if (game === 'math') {
                if (newScore > user.stats.math.bestScore) {
                    user.stats.math.bestScore = newScore;
                }
            } else if (game === 'color') {
                if (!user.stats.color.bestTime || newScore < user.stats.color.bestTime) {
                    user.stats.color.bestTime = newScore;
                }
            } else if (game === 'puzzle') {
                if (!user.stats.puzzle.bestMoves || newScore < user.stats.puzzle.bestMoves) {
                    user.stats.puzzle.bestMoves = newScore;
                }
            }
            
            this.saveUsers(users);
            
            // Atualizar usuário atual se for o mesmo
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.email === userId) {
                currentUser.stats = user.stats;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        }
    },
    
    // Obter ranking para um jogo específico
    getRanking: function(game) {
        const scores = this.getScores();
        return scores[game];
    },
    
    // Obter posição do usuário no ranking
    getUserRank: function(game, userId) {
        const ranking = this.getRanking(game);
        const userIndex = ranking.findIndex(score => score.userId === userId);
        return userIndex !== -1 ? userIndex + 1 : null;
    }
};

// Utilitários de Segurança
const SecurityUtils = {
    // Codificação básica para senhas (não é criptografia real, apenas ofuscação)
    encodePassword: function(password) {
        // Adiciona um salt simples para dificultar a reversão
        const salt = 'logicagames_salt_2024';
        return btoa(password + salt);
    },
    
    // Verificar força da senha
    checkPasswordStrength: function(password) {
        const minLength = 6;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        
        let strength = 0;
        if (password.length >= minLength) strength++;
        if (hasUpperCase) strength++;
        if (hasLowerCase) strength++;
        if (hasNumbers) strength++;
        
        return {
            score: strength,
            strong: strength >= 3,
            message: strength >= 3 ? 'Senha forte' : 'Use pelo menos 6 caracteres com letras maiúsculas, minúsculas e números'
        };
    },
    
    // Validar formato de email
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
};

// ============ SISTEMA DE TEMA CLARO/ESCURO ============

// Verificar tema salvo no localStorage
function getSavedTheme() {
    return localStorage.getItem('theme') || 'light';
}

// Salvar tema no localStorage
function saveTheme(theme) {
    localStorage.setItem('theme', theme);
}

// Alternar entre temas
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (!themeToggle) {
        console.error('Botão de tema não encontrado!');
        return;
    }
    
    const icon = themeToggle.querySelector('i');
    
    if (body.classList.contains('dark-mode')) {
        // Mudar para modo claro
        body.classList.remove('dark-mode');
        if (icon) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
        themeToggle.title = "Alternar para modo escuro";
        saveTheme('light');
        showNotification('🌞 Modo claro ativado', 'info');
    } else {
        // Mudar para modo escuro
        body.classList.add('dark-mode');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
        themeToggle.title = "Alternar para modo claro";
        saveTheme('dark');
        showNotification('🌙 Modo escuro ativado', 'info');
    }
}

// Aplicar tema salvo ao carregar a página
function applySavedTheme() {
    const savedTheme = getSavedTheme();
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (!themeToggle) {
        console.warn('Botão de tema não encontrado para aplicar o tema');
        return;
    }
    
    const icon = themeToggle.querySelector('i');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
        themeToggle.title = "Alternar para modo claro";
    } else {
        body.classList.remove('dark-mode');
        if (icon) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
        themeToggle.title = "Alternar para modo escuro";
    }
}

// Inicializar o banco de dados
if (!DB.init()) {
    console.error('Falha crítica na inicialização do banco de dados');
    // Mostrar erro para o usuário
    document.addEventListener('DOMContentLoaded', function() {
        showNotification('Erro ao carregar os dados. Por favor, recarregue a página.', 'error');
    });
}

// Elementos do DOM essenciais (mantidos no principal)
const gameSections = {
    mathQuiz: document.getElementById('mathQuiz'),
    colorMatch: document.getElementById('colorMatch'),
    numberPuzzle: document.getElementById('numberPuzzle')
};

// Elementos do ranking
const rankingTables = {
    math: document.getElementById('mathRanking'),
    color: document.getElementById('colorRanking'),
    puzzle: document.getElementById('puzzleRanking')
};

// Variáveis globais dos jogos (necessárias para comunicação entre módulos)
let currentUser = DB.getCurrentUser();
let isGuestMode = false; // Novo: modo visitante
let mathScore = 0;
let mathTimer = 60;
let mathTimerInterval;
let currentQuestion = {};

let colorMoves = 0;
let colorPairs = 0;
let colorTime = 0;
let colorTimerInterval;
let selectedColors = [];
let matchedPairs = 0;
let colors = [];

let puzzleMoves = 0;
let puzzleState = [1, 2, 3, 4, 5, 6, 7, 8, 0];

// ============ FUNÇÕES DE AUTENTICAÇÃO PARA O PERFIL ============

// Função para verificar login antes de acessar o perfil
function checkAuthForProfile() {
    currentUser = DB.getCurrentUser();
    
    if (!currentUser && !isGuestMode) {
        // Se não estiver logado e não for visitante, mostrar mensagem
        showNotification('🔒 Você precisa estar logado para acessar o perfil!', 'warning');
        
        // Mostrar modal de login se disponível
        if (typeof AuthModule !== 'undefined' && typeof AuthModule.showAuthModal === 'function') {
            AuthModule.showAuthModal();
        }
        return false;
    }
    return true;
}

// Função para carregar dados do perfil
function loadProfileData() {
    const profileSection = document.getElementById('profile');
    if (!profileSection) return;
    
    currentUser = DB.getCurrentUser();
    
    if (isGuestMode) {
        // Modo visitante
        profileSection.innerHTML = `
            <div class="profile-container">
                <h2><i class="fas fa-user-clock"></i> Modo Visitante</h2>
                <div class="profile-card">
                    <div class="profile-header">
                        <i class="fas fa-user-circle guest-icon"></i>
                        <h3>Visitante</h3>
                        <p class="profile-status">Modo temporário</p>
                    </div>
                    <div class="profile-info">
                        <p><i class="fas fa-info-circle"></i> Suas pontuações não estão sendo salvas.</p>
                        <p><i class="fas fa-sign-in-alt"></i> Faça login para salvar seu progresso!</p>
                    </div>
                    <div class="profile-actions">
                        <button onclick="showSection('games')" class="btn btn-primary">
                            <i class="fas fa-gamepad"></i> Continuar Jogando
                        </button>
                        <button onclick="showAuthModalIfAvailable()" class="btn btn-secondary">
                            <i class="fas fa-user-plus"></i> Fazer Login/Cadastro
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else if (currentUser) {
        // Usuário logado
        const stats = currentUser.stats || { 
            math: { bestScore: 0 }, 
            color: { bestTime: null }, 
            puzzle: { bestMoves: null } 
        };
        
        profileSection.innerHTML = `
            <div class="profile-container">
                <h2><i class="fas fa-user-circle"></i> Meu Perfil</h2>
                <div class="profile-card">
                    <div class="profile-header">
                        <i class="fas fa-user-circle user-icon"></i>
                        <h3>${currentUser.name || 'Usuário'}</h3>
                        <p class="profile-email">${currentUser.email}</p>
                        <p class="profile-status">Membro desde ${new Date(currentUser.createdAt || Date.now()).toLocaleDateString('pt-BR')}</p>
                    </div>
                    
                    <div class="profile-stats">
                        <h4><i class="fas fa-chart-line"></i> Minhas Estatísticas</h4>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <i class="fas fa-calculator"></i>
                                <span>Quiz Matemático</span>
                                <strong>${stats.math.bestScore || 0} pontos</strong>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-palette"></i>
                                <span>Color Match</span>
                                <strong>${stats.color.bestTime ? stats.color.bestTime + 's' : 'Nenhum'}</strong>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-puzzle-piece"></i>
                                <span>Number Puzzle</span>
                                <strong>${stats.puzzle.bestMoves || 'Nenhum'} movimentos</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        <button onclick="showSection('games')" class="btn btn-primary">
                            <i class="fas fa-gamepad"></i> Continuar Jogando
                        </button>
                        <button onclick="logoutUser()" class="btn btn-logout">
                            <i class="fas fa-sign-out-alt"></i> Sair da Conta
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Função auxiliar para mostrar modal de auth (ESTAVA FALTANDO NO SEU CÓDIGO!)
function showAuthModalIfAvailable() {
    if (typeof AuthModule !== 'undefined' && typeof AuthModule.showAuthModal === 'function') {
        AuthModule.showAuthModal();
    } else {
        // Fallback: tentar mostrar o modal diretamente
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.classList.remove('hidden');
        } else {
            // Último fallback: ir para a seção de login se existir
            const loginSection = document.getElementById('login');
            if (loginSection) {
                showSection('login');
            } else {
                showNotification('Não foi possível abrir a tela de login.', 'error');
            }
        }
    }
}

// Função de logout melhorada
function logoutUser() {
    DB.logoutUser();
    currentUser = null;
    isGuestMode = false;
    
    // Atualizar UI
    if (typeof AuthModule !== 'undefined' && typeof AuthModule.updateUI === 'function') {
        AuthModule.updateUI();
    } else {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const profileLink = document.getElementById('profileLink');
        
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
        if (profileLink) profileLink.classList.add('hidden');
    }
    
    showNotification('👋 Você saiu da sua conta.', 'info');
    showSection('home');
}

// ============ FUNÇÕES GLOBAIS PARA OS MÓDULOS ============
// Estas funções são chamadas pelos módulos de jogo

window.endMathGame = function() {
    const feedbackElement = document.getElementById('mathFeedback');
    if (feedbackElement) feedbackElement.textContent = `Fim do jogo! Sua pontuação final: ${mathScore}`;
    
    // Verificar se não é modo visitante
    if (!isGuestMode && currentUser && mathScore > 0) {
        const scoreData = {
            userId: currentUser.email,
            userName: currentUser.name,
            score: mathScore,
            date: new Date().toISOString()
        };
        
        DB.addScore('math', scoreData);
        DB.updateUserStats(currentUser.email, 'math', mathScore);
        
        // Atualizar UI
        if (typeof AuthModule !== 'undefined' && typeof AuthModule.updateUI === 'function') {
            AuthModule.updateUI();
        }
        
        showNotification(`🏆 Nova pontuação: ${mathScore} pontos!`, 'success');
    } else if (isGuestMode) {
        showNotification(`🎯 Você fez ${mathScore} pontos! Faça login para salvar sua pontuação.`, 'info');
    }
    
    const options = document.querySelectorAll('#mathOptions .option');
    options.forEach(option => {
        option.style.pointerEvents = 'none';
    });
};

window.endColorGame = function() {
    clearInterval(colorTimerInterval);
    const colorFeedbackElement = document.getElementById('colorFeedback');
    if (colorFeedbackElement) colorFeedbackElement.textContent = `Parabéns! Você completou o jogo em ${colorMoves} movimentos e ${colorTime} segundos!`;
    
    if (!isGuestMode && currentUser) {
        const scoreData = {
            userId: currentUser.email,
            userName: currentUser.name,
            score: colorTime,
            date: new Date().toISOString()
        };
        
        DB.addScore('color', scoreData);
        DB.updateUserStats(currentUser.email, 'color', colorTime);
        
        // Atualizar UI
        if (typeof AuthModule !== 'undefined' && typeof AuthModule.updateUI === 'function') {
            AuthModule.updateUI();
        }
        
        showNotification(`🎨 Tempo recorde: ${colorTime} segundos!`, 'success');
    } else if (isGuestMode) {
        showNotification(`⏱️ Tempo: ${colorTime}s | Movimentos: ${colorMoves} | Faça login para salvar!`, 'info');
    }
};

window.endPuzzleGame = function() {
    const puzzleFeedbackElement = document.getElementById('puzzleFeedback');
    if (puzzleFeedbackElement) puzzleFeedbackElement.textContent = `Parabéns! Você resolveu o quebra-cabeça em ${puzzleMoves} movimentos!`;
    
    if (!isGuestMode && currentUser) {
        const scoreData = {
            userId: currentUser.email,
            userName: currentUser.name,
            score: puzzleMoves,
            date: new Date().toISOString()
        };
        
        DB.addScore('puzzle', scoreData);
        DB.updateUserStats(currentUser.email, 'puzzle', puzzleMoves);
        
        if (typeof AuthModule !== 'undefined' && typeof AuthModule.updateUI === 'function') {
            AuthModule.updateUI();
        }
        
        showNotification(`🧩 Resolvido em ${puzzleMoves} movimentos!`, 'success');
    } else if (isGuestMode) {
        showNotification(`✅ Resolvido em ${puzzleMoves} movimentos! Faça login para salvar.`, 'info');
    }
};

// Funções de navegação (mantidas no principal)
function showSection(sectionId) {
    // VERIFICAÇÃO DO PERFIL
    if (sectionId === 'profile') {
        if (!checkAuthForProfile()) {
            return; // Não mostrar a seção se não estiver autenticado
        }
        loadProfileData(); // Carregar dados do perfil
    }
    
    const sections = document.querySelectorAll('.section');
    const targetSection = document.getElementById(sectionId);
    
    if (!targetSection) {
        console.error(`Seção ${sectionId} não encontrada!`);
        showNotification(`Seção não encontrada: ${sectionId}`, 'error');
        return;
    }
    
    // Esconder todas as seções
    sections.forEach(section => {
        if (section) {
            section.classList.remove('active');
            section.classList.add('hidden');
        }
    });
    
    // Mostrar a seção alvo
    targetSection.classList.add('active');
    targetSection.classList.remove('hidden');
    
    // Se for a seção de jogos, garantir que o grid esteja visível
    if (sectionId === 'games') {
        const gamesGrid = document.getElementById('gamesGrid') || document.querySelector('.games-grid');
        if (gamesGrid) {
            gamesGrid.classList.remove('hidden');
        }
        
        // Esconder jogos ativos se estiverem visíveis
        Object.values(gameSections).forEach(section => {
            if (section) {
                section.classList.add('hidden');
            }
        });
    }
    
    // Se for ranking, atualizar
    if (sectionId === 'ranking') {
        updateRanking('math');
    }
    
    // Fechar menu mobile se aberto
    const navLinksContainer = document.getElementById('navLinks');
    if (navLinksContainer && navLinksContainer.classList.contains('active')) {
        navLinksContainer.classList.remove('active');
    }
    
    console.log(`Seção ${sectionId} mostrada com sucesso`);
}

function showGame(gameId) {
    // Esconder o grid de jogos
    const gamesGrid = document.getElementById('gamesGrid') || document.querySelector('.games-grid');
    if (gamesGrid) {
        gamesGrid.classList.add('hidden');
    }
    
    // Esconder todos os jogos ativos
    Object.values(gameSections).forEach(section => {
        if (section) section.classList.add('hidden');
    });
    
    // Mostrar o jogo selecionado
    const gameSection = gameSections[gameId];
    if (gameSection) {
        gameSection.classList.remove('hidden');
        
        // Chamar função do módulo de jogos
        if (typeof GamesModule !== 'undefined' && typeof GamesModule.initGame === 'function') {
            GamesModule.initGame(gameId);
        } else {
            // Fallback se o módulo não estiver disponível
            console.warn('Módulo de jogos não disponível, usando fallback');
            if (gameId === 'mathQuiz') {
                if (typeof initMathQuiz === 'function') initMathQuiz();
            } else if (gameId === 'colorMatch') {
                if (typeof initColorMatch === 'function') initColorMatch();
            } else if (gameId === 'numberPuzzle') {
                if (typeof initNumberPuzzle === 'function') initNumberPuzzle();
            }
        }
    }
}

function showGameMenu() {
    if (mathTimerInterval) clearInterval(mathTimerInterval);
    if (colorTimerInterval) clearInterval(colorTimerInterval);
    
    // Esconder todos os jogos ativos
    Object.values(gameSections).forEach(section => {
        if (section) section.classList.add('hidden');
    });
    
    // Mostrar o grid de jogos
    const gamesGrid = document.getElementById('gamesGrid') || document.querySelector('.games-grid');
    if (gamesGrid) {
        gamesGrid.classList.remove('hidden');
    }
}

// Funções utilitárias (usadas por vários módulos)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function updateRanking(gameType) {
    const table = rankingTables[gameType];
    if (!table) return;
    
    const tableBody = table.querySelector('tbody');
    if (!tableBody) return;
    
    const ranking = DB.getRanking(gameType);
    
    tableBody.innerHTML = '';
    
    if (ranking.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-trophy" style="font-size: 2rem; color: #ffd166; margin-bottom: 1rem;"></i>
                <p>Nenhuma pontuação registrada ainda!</p>
                <p style="font-size: 0.9rem; color: #7f8c8d; margin-top: 0.5rem;">
                    ${!currentUser && !isGuestMode ? 'Faça login para participar!' : 'Seja o primeiro a jogar!'}
                </p>
            </div>
        `;
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    ranking.forEach((score, index) => {
        const row = document.createElement('tr');
        
        const positionCell = document.createElement('td');
        positionCell.textContent = `#${index + 1}`;
        row.appendChild(positionCell);
        
        const nameCell = document.createElement('td');
        nameCell.textContent = score.userName || 'Anônimo';
        row.appendChild(nameCell);
        
        const scoreCell = document.createElement('td');
        if (gameType === 'math') {
            scoreCell.textContent = score.score;
        } else if (gameType === 'color') {
            scoreCell.textContent = `${score.score}s`;
        } else {
            scoreCell.textContent = score.score;
        }
        row.appendChild(scoreCell);
        
        const dateCell = document.createElement('td');
        const date = new Date(score.date);
        dateCell.textContent = date.toLocaleDateString('pt-BR');
        row.appendChild(dateCell);
        
        if (currentUser && score.userId === currentUser.email) {
            row.style.backgroundColor = '#e3f2fd';
            row.style.fontWeight = 'bold';
        }
        
        tableBody.appendChild(row);
    });
}

// NOVO: Função para entrar como visitante
function enterAsGuest() {
    isGuestMode = true;
    currentUser = null;
    
    // Atualizar UI
    updateGuestUI();
    
    // Mostrar mensagem
    showNotification('🎮 Modo Visitante ativado! Suas pontuações não serão salvas.', 'info');
    
    // Ir para jogos
    showSection('games');
}

// NOVO: Atualizar UI para modo visitante
function updateGuestUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileLink = document.getElementById('profileLink');
    
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (profileLink) profileLink.classList.add('hidden');
}

// NOVO: Sistema de notificações
function showNotification(message, type = 'info') {
    // Remover notificações antigas
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(notification => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Ícone baseado no tipo
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
        border-left: 4px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : '#bee5eb'};
        border-radius: 5px;
        z-index: 10000;
        min-width: 300px;
        max-width: 400px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        font-size: 0.95rem;
    `;
    
    document.body.appendChild(notification);
    
    // Fechar notificação
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ============ CONFIGURAÇÃO DOS EVENT LISTENERS ============
function setupEventListeners() {
    // Links do menu principal
    const navLinks = document.querySelectorAll('.nav-link');
    if (navLinks && navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                console.log(`Navegando para: ${sectionId}`);
                if (sectionId) {
                    showSection(sectionId);
                }
            });
        });
    }
    
    // Botões "Iniciar Jogo" nos cards
    const startButtons = document.querySelectorAll('.btn-start');
    if (startButtons && startButtons.length > 0) {
        startButtons.forEach(button => {
            button.addEventListener('click', function() {
                const gameId = this.getAttribute('data-game');
                console.log(`Iniciando jogo: ${gameId}`);
                showSection('games');
                setTimeout(() => {
                    showGame(gameId);
                }, 50);
            });
        });
    }
    
    // Botões "Voltar" nos jogos
    const backButtons = document.querySelectorAll('.back-btn');
    if (backButtons && backButtons.length > 0) {
        backButtons.forEach(button => {
            button.addEventListener('click', function() {
                showGameMenu();
            });
        });
    }
    
    // Toggle do menu responsivo
    const navToggle = document.getElementById('navToggle');
    const navLinksContainer = document.getElementById('navLinks');
    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', function() {
            navLinksContainer.classList.toggle('active');
        });
    }
    
    // Tabs do ranking
    const rankingTabs = document.querySelectorAll('.ranking-tab');
    if (rankingTabs && rankingTabs.length > 0) {
        rankingTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const rankingType = this.getAttribute('data-ranking');
                
                rankingTabs.forEach(t => {
                    if (t) t.classList.remove('active');
                });
                this.classList.add('active');
                
                Object.values(rankingTables).forEach(table => {
                    if (table) table.classList.add('hidden');
                });
                if (rankingTables[rankingType]) {
                    rankingTables[rankingType].classList.remove('hidden');
                }
                
                updateRanking(rankingType);
            });
        });
    }
    
    // Event listener para o link do perfil
    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
        profileLink.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('profile');
        });
    }
    
    // Botão de alternar tema (ADICIONADO AGORA)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        console.log('✅ Event listener do botão de tema configurado');
    } else {
        console.error('❌ Botão de tema não encontrado!');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('Site inicializando...');
    
    // Aplicar tema salvo (ADICIONADO AGORA)
    applySavedTheme();
    
    // Adicionar loader
    const loader = document.createElement('div');
    loader.id = 'siteLoader';
    loader.innerHTML = '<div class="loader-content"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Carregando jogos...</p></div>';
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        transition: opacity 0.5s ease;
    `;
    document.body.appendChild(loader);
    
    // Configurar event listeners
    setupEventListeners();
    
    // Atualizar UI inicial
    if (typeof AuthModule !== 'undefined' && typeof AuthModule.updateUI === 'function') {
        AuthModule.updateUI();
    } else {
        // Fallback básico
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const profileLink = document.getElementById('profileLink');
        
        if (currentUser) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (profileLink) profileLink.classList.remove('hidden');
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (profileLink) profileLink.classList.add('hidden');
        }
    }
    
    // Adicionar botão de visitante ao modal de autenticação
    setTimeout(() => {
        if (!document.getElementById('guestBtn')) {
            const modalBody = document.querySelector('.modal-body');
            if (modalBody) {
                const guestBtn = document.createElement('button');
                guestBtn.id = 'guestBtn';
                guestBtn.className = 'btn btn-guest';
                guestBtn.innerHTML = '<i class="fas fa-user-clock"></i> Jogar como Visitante';
                guestBtn.style.cssText = 'width: 100%; margin-top: 0.8rem; background-color: #6c757d; color: white; padding: 0.8rem; font-weight: 600;';
                
                guestBtn.addEventListener('click', function() {
                    if (typeof AuthModule !== 'undefined' && typeof AuthModule.hideAuthModal === 'function') {
                        AuthModule.hideAuthModal();
                    } else {
                        const authModal = document.getElementById('authModal');
                        if (authModal) authModal.classList.add('hidden');
                    }
                    enterAsGuest();
                });
                
                // Inserir após o formulário de login
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    loginForm.parentNode.insertBefore(guestBtn, loginForm.nextSibling);
                }
            }
        }
    }, 100);
    
    showSection('home');
    
    // Inicializar módulos se existirem
    if (typeof TestUserModule !== 'undefined') {
        TestUserModule.init();
        console.log('Módulo de Usuário Teste carregado');
    }
    
    if (typeof AuthModule !== 'undefined') {
        AuthModule.init();
        console.log('Módulo de Autenticação carregado');
    }
    
    if (typeof GamesModule !== 'undefined') {
        GamesModule.init();
        console.log('Módulo de Jogos carregado');
    }
    
    // Remover loader após tudo carregar
    setTimeout(() => {
        const loaderElement = document.getElementById('siteLoader');
        if (loaderElement) {
            loaderElement.style.opacity = '0';
            setTimeout(() => loaderElement.remove(), 500);
        }
        console.log('✅ Site inicializado com sucesso!');
        
        // Mostrar mensagem de boas-vindas
        if (!currentUser && !isGuestMode) {
            showNotification('👋 Bem-vindo! Use o botão "Usuário Teste" para login rápido ou cadastre-se!', 'info');
        }
    }, 800);
});

// Adicionar CSS dinâmico para as animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { 
            transform: translateX(100%); 
            opacity: 0; 
        }
        to { 
            transform: translateX(0); 
            opacity: 1; 
        }
    }
    
    @keyframes slideOut {
        from { 
            transform: translateX(0); 
            opacity: 1; 
        }
        to { 
            transform: translateX(100%); 
            opacity: 0; 
        }
    }
    
    .notification-close {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
        color: inherit;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
    }
    
    .notification-close:hover {
        background-color: rgba(0,0,0,0.1);
    }
    
    .loader-content {
        text-align: center;
        color: #2c3e50;
    }
    
    .loader-content i {
        color: #4a6fa5;
        margin-bottom: 1rem;
    }
    
    .loader-content p {
        margin-top: 1rem;
        font-weight: 500;
        font-size: 1.1rem;
    }
    
    .btn-guest:hover {
        background-color: #5a6268 !important;
        transform: translateY(-1px);
        transition: all 0.3s ease;
    }
    
    /* ============ ESTILOS DO PERFIL ============ */
    .profile-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }
    
    .profile-card {
        background: white;
        border-radius: 15px;
        padding: 2rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        margin-top: 1rem;
        border: 1px solid #e0e0e0;
    }
    
    .profile-header {
        text-align: center;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 2px solid #f0f7ff;
    }
    
    .user-icon, .guest-icon {
        font-size: 4rem;
        color: #4a6fa5;
        margin-bottom: 1rem;
    }
    
    .guest-icon {
        color: #6c757d;
    }
    
    .profile-email {
        color: #7f8c8d;
        font-size: 0.9rem;
        margin: 0.5rem 0;
    }
    
    .profile-status {
        color: #4a6fa5;
        font-weight: 500;
        font-size: 0.9rem;
    }
    
    .profile-stats {
        margin: 2rem 0;
    }
    
    .profile-stats h4 {
        color: #2c3e50;
        margin-bottom: 1.5rem;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }
    
    .stat-item {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 10px;
        text-align: center;
        border-left: 4px solid #4a6fa5;
        transition: transform 0.3s ease;
    }
    
    .stat-item:hover {
        transform: translateY(-3px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .stat-item i {
        font-size: 1.5rem;
        color: #4a6fa5;
        margin-bottom: 0.5rem;
    }
    
    .stat-item span {
        display: block;
        color: #7f8c8d;
        font-size: 0.9rem;
        margin-bottom: 0.3rem;
    }
    
    .stat-item strong {
        font-size: 1.2rem;
        color: #2c3e50;
    }
    
    .profile-info {
        background: #e3f2fd;
        padding: 1rem;
        border-radius: 10px;
        margin: 1.5rem 0;
        border-left: 4px solid #4a6fa5;
    }
    
    .profile-info p {
        margin: 0.5rem 0;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .profile-actions {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
        flex-wrap: wrap;
    }
    
    .profile-actions .btn {
        flex: 1;
        min-width: 150px;
        padding: 0.8rem 1.5rem;
        font-weight: 600;
    }
    
    .btn-logout {
        background-color: #e74c3c;
        color: white;
        border: none;
    }
    
    .btn-logout:hover {
        background-color: #c0392b;
    }
    
    @media (max-width: 600px) {
        .profile-actions {
            flex-direction: column;
        }
        
        .profile-actions .btn {
            width: 100%;
        }
        
        .stats-grid {
            grid-template-columns: 1fr;
        }
    }
`;
document.head.appendChild(style);

// ============ DEBUG E VERIFICAÇÕES ============
console.log("=== DEBUG DO SISTEMA ===");
console.log("1. currentUser:", currentUser);
console.log("2. isGuestMode:", isGuestMode);
console.log("3. Função checkAuthForProfile:", typeof checkAuthForProfile);
console.log("4. Função loadProfileData:", typeof loadProfileData);
console.log("5. Função showAuthModalIfAvailable:", typeof showAuthModalIfAvailable);
console.log("6. Elemento #profile:", document.getElementById('profile'));
console.log("7. Elemento #themeToggle:", document.getElementById('themeToggle'));

// Teste manual: força o carregamento do perfil
window.debugProfile = function() {
    console.log("=== DEBUG FORÇADO DO PERFIL ===");
    currentUser = DB.getCurrentUser();
    console.log("Usuário do DB:", currentUser);
    console.log("É visitante?", isGuestMode);
    
    if (!currentUser && !isGuestMode) {
        console.log("❌ Não está logado e não é visitante");
        showNotification('Teste: Você precisa estar logado!', 'warning');
    } else if (isGuestMode) {
        console.log("✅ Modo visitante ativo");
        loadProfileData();
    } else if (currentUser) {
        console.log("✅ Usuário logado:", currentUser.name);
        loadProfileData();
    }
};

// FORÇAR CORREÇÃO DOS EVENT LISTENERS (solução definitiva)
function forceFixProfileLink() {
    console.log("=== CORRIGINDO LINK DO PERFIL ===");
    
    const profileLink = document.getElementById('profileLink');
    if (profileLink) {
        console.log("Link do perfil encontrado");
        
        // Remover todos os event listeners antigos
        const newProfileLink = profileLink.cloneNode(true);
        profileLink.parentNode.replaceChild(newProfileLink, profileLink);
        
        // Adicionar novo event listener
        newProfileLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Perfil clicado - redirecionando para showSection('profile')");
            showSection('profile');
        });
        
        console.log("✅ Link do perfil corrigido");
    } else {
        console.log("❌ Link do perfil não encontrado!");
    }
}

// Executar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(forceFixProfileLink, 1000);
});

// Adicionar botão de debug se não estiver em produção
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const debugBtn = document.createElement('button');
    debugBtn.textContent = '🐛 Debug Perfil';
    debugBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #ff6b6b;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        cursor: pointer;
        z-index: 9999;
        font-size: 12px;
    `;
    debugBtn.onclick = window.debugProfile;
    document.body.appendChild(debugBtn);
}

// Função de teste para verificar o sistema de tema
window.testThemeSystem = function() {
    console.log("=== TESTE DO SISTEMA DE TEMA ===");
    console.log("1. Tema salvo:", getSavedTheme());
    console.log("2. Body tem classe dark-mode?", document.body.classList.contains('dark-mode'));
    console.log("3. Botão themeToggle existe?", document.getElementById('themeToggle'));
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        console.log("4. Ícone atual:", icon ? icon.className : 'não encontrado');
        console.log("5. Title do botão:", themeToggle.title);
    }
    
    // Testar alternância
    toggleTheme();
};
