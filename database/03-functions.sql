-- =====================================================
-- 1. FUNCAO PARA ATUALIZAR O STATUS
-- =====================================================

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
