-- 1. LIMPEZA TOTAL (Para evitar erros de 'Already Exists')
DROP TABLE IF EXISTS Sessoes CASCADE;
DROP TABLE IF EXISTS Disponibilidades CASCADE;
DROP TABLE IF EXISTS Avaliacoes CASCADE;
DROP TABLE IF EXISTS Inscricoes CASCADE;
DROP TABLE IF EXISTS Turma_Modulos CASCADE;
DROP TABLE IF EXISTS Turmas CASCADE;
DROP TABLE IF EXISTS Modulos CASCADE;
DROP TABLE IF EXISTS Cursos CASCADE;
DROP TABLE IF EXISTS Areas CASCADE;
DROP TABLE IF EXISTS UserFicheiros CASCADE;
DROP TABLE IF EXISTS Formandos CASCADE;
DROP TABLE IF EXISTS Formadores CASCADE;
DROP TABLE IF EXISTS Users CASCADE;
DROP TABLE IF EXISTS Salas CASCADE;

-- Apagar tipos antigos para recriar
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS estado_turma CASCADE;
DROP TYPE IF EXISTS tipo_sala CASCADE;
DROP TYPE IF EXISTS estado_inscricao CASCADE;

-- ENUMS 
CREATE TYPE user_role AS ENUM ('SuperAdmin', 'Admin', 'Secretaria', 'Formador', 'Formando');
CREATE TYPE estado_turma AS ENUM ('Planeada', 'Decorrer', 'Terminada', 'Cancelada');
CREATE TYPE tipo_sala AS ENUM ('Teorica', 'Informatica', 'Oficina', 'Reuniao');
CREATE TYPE estado_inscricao AS ENUM ('Ativo', 'Desistiu', 'Concluido');

-- TABELAS DE AUTENTICAÇÃO E UTILIZADORES
CREATE TABLE Users (
    ID SERIAL PRIMARY KEY,
    Email VARCHAR(150) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255), -- NULL se for login social
    GoogleID VARCHAR(255),
    FacebookID VARCHAR(255),
    IsActive BOOLEAN DEFAULT FALSE, -- Ativação Email
    Role VARCHAR(20) NOT NULL CHECK (Role IN ('SuperAdmin', 'Admin', 'Secretaria', 'Formador', 'Formando')),
    AvatarURL TEXT,
    
    -- Dados Pessoais (Normalizados)
    Nome VARCHAR(100),
    Telefone VARCHAR(20),
    NIF VARCHAR(9),
    Morada TEXT,
    CC VARCHAR(20),
    
    -- Segurança Extra
    ResetToken VARCHAR(255),
    ResetTokenExpiry TIMESTAMP,
    TwoFactorSecret VARCHAR(255), -- Para Autenticação 2FA
    TwoFactorEnabled BOOLEAN DEFAULT FALSE,
    
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE UserFicheiros (
    ID SERIAL PRIMARY KEY,
    UserID INT REFERENCES Users(ID) ON DELETE CASCADE,
    Ficheiro BYTEA,
    NomeFicheiro VARCHAR(255)
);

-- Extensões de Utilizadores
CREATE TABLE Formadores (
    UserID INT PRIMARY KEY REFERENCES Users(ID) ON DELETE CASCADE,
    AreaEspecializacao VARCHAR(100),
    CorCalendario VARCHAR(7)
);

CREATE TABLE Formandos (
    UserID INT PRIMARY KEY REFERENCES Users(ID) ON DELETE CASCADE,
    NumeroAluno VARCHAR(20) UNIQUE,
    DataNascimento DATE
);

-- ÁREA PEDAGÓGICA (CURSOS E TURMAS)
CREATE TABLE Areas (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL
);

CREATE TABLE Cursos (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(150) NOT NULL,
    AreaID INT REFERENCES Areas(ID),
    NivelCurso VARCHAR(50),
    Local VARCHAR(100)
);

CREATE TABLE Modulos (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(150) NOT NULL,
    CargaHoraria INT NOT NULL,
    Nivel VARCHAR(50)
);

CREATE TABLE Turmas (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    CursoID INT REFERENCES Cursos(ID),
    DataInicio TIMESTAMP,
    DataFim TIMESTAMP,
    Local VARCHAR(100),
    Estado estado_turma DEFAULT 'Planeada'
);

-- Tabela Pivot (A estrutura da Turma)
CREATE TABLE Turma_Modulos (
    ID SERIAL PRIMARY KEY,
    TurmaID INT REFERENCES Turmas(ID) ON DELETE CASCADE,
    ModuloID INT REFERENCES Modulos(ID),
    FormadorID INT REFERENCES Formadores(UserID),
    Sequencia INT NOT NULL,
    
    UNIQUE(TurmaID, ModuloID) -- Um módulo só aparece uma vez por turma
);

-- INSCRIÇÕES E AVALIAÇÕES
CREATE TABLE Inscricoes (
    ID SERIAL PRIMARY KEY,
    TurmaID INT REFERENCES Turmas(ID),
    FormandoID INT REFERENCES Formandos(UserID),
    CursoID INT REFERENCES Cursos(ID), -- Redundância controlada útil para queries rápidas
    DataInscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Estado estado_inscricao DEFAULT 'Ativo',

    UNIQUE(TurmaID, FormandoID), -- Índice para a FK composta abaixo
    UNIQUE(ID, TurmaID)          -- Índice necessário para a FK da tabela Avaliacoes
);

-- Adicionar constraints de validação cruzada para garantir integridade
ALTER TABLE Turma_Modulos ADD CONSTRAINT uq_turmamodulo_turma UNIQUE (ID, TurmaID);

CREATE TABLE Avaliacoes (
    ID SERIAL PRIMARY KEY,
    TurmaID INT NOT NULL REFERENCES Turmas(ID),
    
    -- Validação: O aluno pertence a ESTA turma?
    InscricaoID INT NOT NULL,
    FOREIGN KEY (InscricaoID, TurmaID) REFERENCES Inscricoes(ID, TurmaID) ON DELETE CASCADE,
    
    -- Validação: O módulo pertence a ESTA turma?
    TurmaModuloID INT NOT NULL,
    FOREIGN KEY (TurmaModuloID, TurmaID) REFERENCES Turma_Modulos(ID, TurmaID) ON DELETE CASCADE,
    
    Avaliacao DECIMAL(4,2), -- Nota 0-20
    Observacoes TEXT
);

-- LOGÍSTICA (SALAS E HORÁRIOS)
CREATE TABLE Salas (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(50),
    Tipo tipo_sala,
    Capacidade INT
);

CREATE TABLE Disponibilidades (
    ID SERIAL PRIMARY KEY,
    EntidadeID INT NOT NULL, -- FK genérica gerida pela lógica abaixo
    TipoEntidade VARCHAR(20) CHECK (TipoEntidade IN ('Formador', 'Sala')),
    
    -- Campos reais para as FKs (Lógica "Exclusive Arc")
    FormadorID INT REFERENCES Formadores(UserID) ON DELETE CASCADE,
    SalaID INT REFERENCES Salas(ID) ON DELETE CASCADE,
    
    DataInicio TIMESTAMP,
    DataFim TIMESTAMP,
    Disponivel BOOLEAN DEFAULT TRUE,
    
    -- Garante que ou é Sala ou Formador, nunca ambos
    CONSTRAINT chk_entidade CHECK (
        (FormadorID IS NOT NULL AND SalaID IS NULL AND TipoEntidade = 'Formador') OR
        (FormadorID IS NULL AND SalaID IS NOT NULL AND TipoEntidade = 'Sala')
    )
);

CREATE TABLE Sessoes (
    ID SERIAL PRIMARY KEY,
    CursoModuloID INT REFERENCES Turma_Modulos(ID) ON DELETE CASCADE,
    SalaID INT REFERENCES Salas(ID),
    HorarioInicio TIMESTAMP NOT NULL,
    HorarioFim TIMESTAMP NOT NULL,
    
    -- Prevenção de sobreposição (Usando range types do Postgres seria melhor, mas simples para começar)
    CHECK (HorarioFim > HorarioInicio)
);