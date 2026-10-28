INSERT INTO "ROLES" (rolenam, roledesc)
VALUES
    ('ADMIN', 'Administrador tecnico do sistema'),
    ('ADMINISTRADOR', 'Sindico do condominio'),
    ('USUARIO', 'Morador que solicita servicos'),
    ('PRESTADOR_SERVICO', 'Prestador de servicos')
ON CONFLICT (rolenam) DO NOTHING;


INSERT INTO "CATEGORIAS_SOLICITACAO" (catnom)
VALUES
    ('Eletrica'),
    ('Hidraulica'),
    ('Marcenaria')
ON CONFLICT (catnom) DO NOTHING;


INSERT INTO "PRIORIDADES_SOLICITACAO" (prinom)
VALUES
    ('Baixa'),
    ('Normal'),
    ('Alta'),
    ('Urgente')
ON CONFLICT (prinom) DO NOTHING;


INSERT INTO "STATUS_SOLICITACAO" (stsnom)
VALUES
    ('Aberta'),
    ('Aprovada'),
    ('Atribuida'),
    ('Em andamento'),
    ('Concluida'),
    ('Aceita'),
    ('Faturada'),
    ('Finalizada'),
    ('Cancelada')
ON CONFLICT (stsnom) DO NOTHING;


INSERT INTO "TIPOS_ALTERACAO" (typnom)
VALUES
    ('Apartamento'),
    ('Usuario'),
    ('Prestador'),
    ('Conclusao'),
    ('Descricao'),
    ('Status'),
    ('Prioridade')
ON CONFLICT (typnom) DO NOTHING;