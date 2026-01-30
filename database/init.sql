-- 1. LIMPEZA TOTAL
DROP TABLE IF EXISTS "Sessoes" CASCADE;
DROP TABLE IF EXISTS "Disponibilidades" CASCADE;
DROP TABLE IF EXISTS "Avaliacoes" CASCADE;
DROP TABLE IF EXISTS "Inscricoes" CASCADE;
DROP TABLE IF EXISTS "Turma_Modulos" CASCADE;
DROP TABLE IF EXISTS "Turmas" CASCADE;
DROP TABLE IF EXISTS "Modulos" CASCADE;
DROP TABLE IF EXISTS "Cursos" CASCADE;
DROP TABLE IF EXISTS "Areas" CASCADE;
DROP TABLE IF EXISTS "UserFicheiros" CASCADE;
DROP TABLE IF EXISTS "Formandos" CASCADE;
DROP TABLE IF EXISTS "Formadores" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;
DROP TABLE IF EXISTS "Salas" CASCADE;

-- 2. TABELAS (Usando VARCHAR em vez de ENUM para evitar erros de Driver)

CREATE TABLE "Users" (
    "Id" SERIAL PRIMARY KEY,
    "Email" VARCHAR(150) UNIQUE NOT NULL,
    "PasswordHash" VARCHAR(255),
    "GoogleId" VARCHAR(255),
    "FacebookId" VARCHAR(255),
    "IsActive" BOOLEAN DEFAULT FALSE,
    "Role" VARCHAR(50) NOT NULL, -- Ex: 'Formador', 'Admin'
    "Avatar" TEXT,
    
    "Nome" VARCHAR(100),
    "Telefone" VARCHAR(20),
    "NIF" VARCHAR(9),
    "Morada" TEXT,
    "CC" VARCHAR(20),
    
    "ActivationToken" VARCHAR(255),
    "ResetToken" VARCHAR(255),
    "ResetTokenExpires" TIMESTAMP,
    "TwoFactorSecret" VARCHAR(255),
    "IsTwoFactorEnabled" BOOLEAN DEFAULT FALSE,
    
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UserFicheiros" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INT REFERENCES "Users"("Id") ON DELETE CASCADE,
    "Ficheiro" BYTEA,
    "NomeFicheiro" VARCHAR(255),
    "ContentType" VARCHAR(100)
);

CREATE TABLE "Formadores" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INT UNIQUE REFERENCES "Users"("Id") ON DELETE CASCADE,
    "AreaEspecializacao" VARCHAR(100),
    "CorCalendario" VARCHAR(7)
);

CREATE TABLE "Formandos" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INT UNIQUE REFERENCES "Users"("Id") ON DELETE CASCADE,
    "NumeroAluno" VARCHAR(20) UNIQUE,
    "DataNascimento" DATE
);

CREATE TABLE "Areas" (
    "Id" SERIAL PRIMARY KEY,
    "Nome" VARCHAR(100) NOT NULL
);

CREATE TABLE "Cursos" (
    "Id" SERIAL PRIMARY KEY,
    "Nome" VARCHAR(150) NOT NULL,
    "AreaId" INT REFERENCES "Areas"("Id"),
    "NivelCurso" VARCHAR(50),
    "Local" VARCHAR(100)
);

CREATE TABLE "Modulos" (
    "Id" SERIAL PRIMARY KEY,
    "Nome" VARCHAR(150) NOT NULL,
    "CargaHoraria" INT NOT NULL,
    "Nivel" VARCHAR(50)
);

CREATE TABLE "Turmas" (
    "Id" SERIAL PRIMARY KEY,
    "Nome" VARCHAR(100) NOT NULL,
    "CursoId" INT REFERENCES "Cursos"("Id"),
    "DataInicio" TIMESTAMP,
    "DataFim" TIMESTAMP,
    "Local" VARCHAR(100),
    
    -- Validação manual em vez de Enum
    "Estado" VARCHAR(50) DEFAULT 'Planeada' 
    CHECK ("Estado" IN ('Planeada', 'Decorrer', 'Terminada', 'Cancelada'))
);

CREATE TABLE "Turma_Modulos" (
    "Id" SERIAL PRIMARY KEY,
    "TurmaId" INT REFERENCES "Turmas"("Id") ON DELETE CASCADE,
    "ModuloId" INT REFERENCES "Modulos"("Id"),
    "FormadorId" INT REFERENCES "Formadores"("Id"),
    "Sequencia" INT NOT NULL,
    UNIQUE("TurmaId", "ModuloId")
);

CREATE TABLE "Inscricoes" (
    "Id" SERIAL PRIMARY KEY,
    "TurmaId" INT REFERENCES "Turmas"("Id"),
    "FormandoId" INT REFERENCES "Formandos"("Id"),
    "CursoId" INT REFERENCES "Cursos"("Id"),
    "DataInscricao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    "Estado" VARCHAR(50) DEFAULT 'Pendente'
    CHECK ("Estado" IN ('Pendente', 'Ativo', 'Desistiu', 'Concluido')),

    UNIQUE("TurmaId", "FormandoId"),
    UNIQUE("Id", "TurmaId")
);

ALTER TABLE "Turma_Modulos" ADD CONSTRAINT uq_turmamodulo_turma UNIQUE ("Id", "TurmaId");

CREATE TABLE "Avaliacoes" (
    "Id" SERIAL PRIMARY KEY,
    "TurmaId" INT NOT NULL REFERENCES "Turmas"("Id"),
    
    "InscricaoId" INT NOT NULL,
    FOREIGN KEY ("InscricaoId", "TurmaId") REFERENCES "Inscricoes"("Id", "TurmaId") ON DELETE CASCADE,
    
    "TurmaModuloId" INT NOT NULL,
    FOREIGN KEY ("TurmaModuloId", "TurmaId") REFERENCES "Turma_Modulos"("Id", "TurmaId") ON DELETE CASCADE,
    
    "Avaliacao" DECIMAL(4,2),
    "Observacoes" TEXT
);

CREATE TABLE "Salas" (
    "Id" SERIAL PRIMARY KEY,
    "Nome" VARCHAR(50),
    
    "Tipo" VARCHAR(50)
    CHECK ("Tipo" IN ('Teorica', 'Informatica', 'Oficina', 'Reuniao')),
    
    "Capacidade" INT
);

CREATE TABLE "Disponibilidades" (
    "Id" SERIAL PRIMARY KEY,
    "EntidadeId" INT NOT NULL,
    "TipoEntidade" VARCHAR(20) CHECK ("TipoEntidade" IN ('Formador', 'Sala')),
    
    "FormadorId" INT REFERENCES "Formadores"("Id") ON DELETE CASCADE,
    "SalaId" INT REFERENCES "Salas"("Id") ON DELETE CASCADE,
    
    "DataInicio" TIMESTAMP,
    "DataFim" TIMESTAMP,
    "Disponivel" BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT chk_entidade CHECK (
        ("FormadorId" IS NOT NULL AND "SalaId" IS NULL AND "TipoEntidade" = 'Formador') OR
        ("FormadorId" IS NULL AND "SalaId" IS NOT NULL AND "TipoEntidade" = 'Sala')
    )
);

CREATE TABLE "Sessoes" (
    "Id" SERIAL PRIMARY KEY,
    "CursoModuloId" INT REFERENCES "Turma_Modulos"("Id") ON DELETE CASCADE,
    "SalaId" INT REFERENCES "Salas"("Id"),
    "HorarioInicio" TIMESTAMP NOT NULL,
    "HorarioFim" TIMESTAMP NOT NULL,
    
    CHECK ("HorarioFim" > "HorarioInicio")
);