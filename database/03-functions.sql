-- Função para atualizar o status
CREATE OR REPLACE FUNCTION ATUALIZAR_STATUS_SOLICITACAO(
    p_soid INTEGER,
    p_usrid INTEGER,
    p_stsid INTEGER,
    p_descricao TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(100);
    v_status_atual INTEGER;
    v_typid INTEGER;
BEGIN
    -- Verifica se a solicitação existe e obtém seu status atual.
    SELECT stsid
    INTO v_status_atual
    FROM SOLICITACOES
    WHERE soid = p_soid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Solicitação % não encontrada.', p_soid;
    END IF;

    -- Verifica se o usuário responsável pela alteração existe.
    IF NOT EXISTS (
        SELECT 1
        FROM USUARIOS
        WHERE usrid = p_usrid
    ) THEN
        RAISE EXCEPTION
            'Usuário % não encontrado.', p_usrid;
    END IF;

    -- Obtém o nome do novo status.
    SELECT stsnom
    INTO v_status
    FROM STATUS_SOLICITACAO
    WHERE stsid = p_stsid;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Status % não encontrado.', p_stsid;
    END IF;

    -- Obtém o tipo de alteração correspondente a uma mudança de status.
    SELECT typid
    INTO v_typid
    FROM TIPOS_ALTERACAO
    WHERE typnom = 'Status';

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Tipo de alteração "Status" não cadastrado.';
    END IF;

    -- Não registra uma alteração se o status já for o mesmo.
    IF v_status_atual = p_stsid THEN
        RAISE NOTICE
            'A solicitação % já possui o status informado.',
            p_soid;
        RETURN;
    END IF;

    -- Atualiza o status e registra o encerramento quando aplicável.
    UPDATE SOLICITACOES
    SET stsid = p_stsid,
        socls = CASE
            WHEN v_status IN ('Concluida', 'Finalizada')
                THEN COALESCE(socls, CURRENT_TIMESTAMP)
            ELSE socls
        END
    WHERE soid = p_soid;

    -- Registra a alteração no histórico.
    INSERT INTO ALTERACOES (
        soid,
        usrid,
        typid,
        altdes,
        altdat
    )
    VALUES (
        p_soid,
        p_usrid,
        v_typid,
        COALESCE(
            NULLIF(TRIM(p_descricao), ''),
            'Status alterado para ' || v_status
        ),
        CURRENT_TIMESTAMP
    );
END;
$$;


-- Função para validar a consistência entre papéis e perfis de usuário
CREATE OR REPLACE FUNCTION FN_VALIDAR_CONSISTENCIA_USUARIO(
    p_usrid INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_tem_papel BOOLEAN;
    v_tem_perfil BOOLEAN;
BEGIN
    -- Verifica se o usuário ainda existe.
    IF NOT EXISTS (
        SELECT 1
        FROM "USUARIOS"
        WHERE usrid = p_usrid
    ) THEN
        RETURN;
    END IF;

    -- =========================================
    -- PAPEL USUARIO <-> PERFIL MORADORES
    -- =========================================

    SELECT EXISTS (
        SELECT 1
        FROM "USUARIO_ROLES" ur
        JOIN "ROLES" r ON r.roleid = ur.roleid
        WHERE ur.usrid = p_usrid
          AND r.rolenam = 'USUARIO'
    )
    INTO v_tem_papel;

    SELECT EXISTS (
        SELECT 1
        FROM "MORADORES"
        WHERE usrid = p_usrid
    )
    INTO v_tem_perfil;

    IF v_tem_papel IS DISTINCT FROM v_tem_perfil THEN
        RAISE EXCEPTION
            'Inconsistencia no usuario %: o papel USUARIO e o perfil MORADORES devem existir juntos.',
            p_usrid;
    END IF;

    -- =========================================
    -- PAPEL PRESTADOR_SERVICO <-> PERFIL PRESTADORES
    -- =========================================

    SELECT EXISTS (
        SELECT 1
        FROM "USUARIO_ROLES" ur
        JOIN "ROLES" r ON r.roleid = ur.roleid
        WHERE ur.usrid = p_usrid
          AND r.rolenam = 'PRESTADOR_SERVICO'
    )
    INTO v_tem_papel;

    SELECT EXISTS (
        SELECT 1
        FROM "PRESTADORES_SERVICO"
        WHERE usrid = p_usrid
    )
    INTO v_tem_perfil;

    IF v_tem_papel IS DISTINCT FROM v_tem_perfil THEN
        RAISE EXCEPTION
            'Inconsistencia no usuario %: o papel PRESTADOR_SERVICO e o perfil PRESTADORES_SERVICO devem existir juntos.',
            p_usrid;
    END IF;

END;
$$;


-- Função para validar a consistência entre papéis e perfis de usuário
CREATE OR REPLACE FUNCTION FN_TRG_VALIDAR_USUARIO()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_usrid INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_usrid := OLD.usrid;
    ELSE
        v_usrid := NEW.usrid;
    END IF;

    PERFORM FN_VALIDAR_CONSISTENCIA_USUARIO(v_usrid);

    -- Se o identificador foi alterado, verifica o usuário anterior.
    IF TG_OP = 'UPDATE'
       AND OLD.usrid IS DISTINCT FROM NEW.usrid THEN
        PERFORM FN_VALIDAR_CONSISTENCIA_USUARIO(OLD.usrid);
    END IF;

    RETURN NULL;
END;
$$;


-- Função para atualizar a data de fechamento da solicitação
CREATE OR REPLACE FUNCTION FN_ATUALIZAR_DATA_FECHAMENTO()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT stsnom
    INTO v_status
    FROM "STATUS_SOLICITACAO"
    WHERE stsid = NEW.stsid;

    IF v_status IN ('Finalizada', 'Cancelada') THEN
        -- Registra a data de fechamento apenas na transição
        IF OLD.stsid IS DISTINCT FROM NEW.stsid THEN
            NEW.socls := CURRENT_TIMESTAMP;
        ELSIF OLD.socls IS NULL THEN
            NEW.socls := CURRENT_TIMESTAMP;
        END IF;
    ELSE
        -- Solicitação reaberta: remove a data de fechamento
        NEW.socls := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Função para validar CPF
CREATE OR REPLACE FUNCTION FN_VALIDAR_CPF(p_cpf CHAR(11))
RETURNS BOOLEAN AS $$
DECLARE
    v_cpf TEXT;
    v_soma INTEGER := 0;
    v_resto INTEGER;
    v_digito INTEGER;
    i INTEGER;
BEGIN
    IF p_cpf IS NULL THEN
        RETURN FALSE;
    END IF;

    v_cpf := REGEXP_REPLACE(p_cpf, '[^0-9]', '', 'g');

    IF LENGTH(v_cpf) <> 11 THEN
        RETURN FALSE;
    END IF;

    -- Rejeita CPFs com todos os dígitos iguais
    IF v_cpf ~ '^([0-9])\1{10}$' THEN
        RETURN FALSE;
    END IF;

    -- Primeiro dígito verificador
    FOR i IN 1..9 LOOP
        v_soma := v_soma +
            CAST(SUBSTRING(v_cpf FROM i FOR 1) AS INTEGER) * (11 - i);
    END LOOP;

    v_resto := (v_soma * 10) % 11;

    IF v_resto = 10 THEN
        v_resto := 0;
    END IF;

    IF v_resto <> CAST(SUBSTRING(v_cpf FROM 10 FOR 1) AS INTEGER) THEN
        RETURN FALSE;
    END IF;

    -- Segundo dígito verificador
    v_soma := 0;

    FOR i IN 1..10 LOOP
        v_soma := v_soma +
            CAST(SUBSTRING(v_cpf FROM i FOR 1) AS INTEGER) * (12 - i);
    END LOOP;

    v_resto := (v_soma * 10) % 11;

    IF v_resto = 10 THEN
        v_resto := 0;
    END IF;

    RETURN v_resto = CAST(SUBSTRING(v_cpf FROM 11 FOR 1) AS INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Função para validar CNPJ
CREATE OR REPLACE FUNCTION FN_VALIDAR_CNPJ(p_cnpj CHAR(14))
RETURNS BOOLEAN AS $$
DECLARE
    v_cnpj TEXT;
    v_soma INTEGER;
    v_resto INTEGER;
    v_digito INTEGER;
    v_pesos INTEGER[];
    i INTEGER;
BEGIN
    IF p_cnpj IS NULL THEN
        RETURN FALSE;
    END IF;

    v_cnpj := REGEXP_REPLACE(p_cnpj, '[^0-9]', '', 'g');

    IF LENGTH(v_cnpj) <> 14 THEN
        RETURN FALSE;
    END IF;

    -- Rejeita CNPJs com todos os dígitos iguais
    IF v_cnpj ~ '^([0-9])\1{13}$' THEN
        RETURN FALSE;
    END IF;

    -- Primeiro dígito verificador
    v_pesos := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
    v_soma := 0;

    FOR i IN 1..12 LOOP
        v_soma := v_soma +
            CAST(SUBSTRING(v_cnpj FROM i FOR 1) AS INTEGER) * v_pesos[i];
    END LOOP;

    v_resto := v_soma % 11;

    IF v_resto < 2 THEN
        v_digito := 0;
    ELSE
        v_digito := 11 - v_resto;
    END IF;

    IF v_digito <> CAST(SUBSTRING(v_cnpj FROM 13 FOR 1) AS INTEGER) THEN
        RETURN FALSE;
    END IF;

    -- Segundo dígito verificador
    v_pesos := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
    v_soma := 0;

    FOR i IN 1..13 LOOP
        v_soma := v_soma +
            CAST(SUBSTRING(v_cnpj FROM i FOR 1) AS INTEGER) * v_pesos[i];
    END LOOP;

    v_resto := v_soma % 11;

    IF v_resto < 2 THEN
        v_digito := 0;
    ELSE
        v_digito := 11 - v_resto;
    END IF;

    RETURN v_digito = CAST(SUBSTRING(v_cnpj FROM 14 FOR 1) AS INTEGER);
END;
$$ LANGUAGE plpgsql IMMUTABLE;