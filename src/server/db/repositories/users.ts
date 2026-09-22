/**
 * Repositório de `aurea.users`.
 *
 * Substitui a fatia `state.users[email]` do blob — SEM o array `coins`, que
 * tem tabela própria (coins.ts). A forma que entra e sai daqui é `UserRegistro`
 * (diff.ts): a linha, não o `User` do domínio. Quem remonta o `User` com o
 * inventário é repositories/state.ts.
 *
 * `ORDER BY ord` preserva a ordem de inserção: o blob guardava os usuários na
 * ordem do seed, e é assim que as telas os listam.
 */

import type { AppState, Cadastro, DadosBancarios, Endereco, UserEmail, UserSettings } from '@/domain/types'

import type { UserRegistro } from '../diff'
import { json, nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

type LinhaUser = {
  email: string
  name: string
  balance: unknown
  pass: string | null
  last_access: unknown
  prev_access: unknown
  settings: unknown
  cpf: string | null
  nome_completo: string | null
  data_nascimento: string | null
  telefone: string | null
  endereco: unknown
  dados_bancarios: unknown
  cadastro_completado_em: unknown
  cadastro_confirmado_em: unknown
  inadimplente: unknown
}

export interface UserCarregado {
  email: UserEmail
  user: UserRegistro
}

export async function carregarUsers(tx: Consulta): Promise<UserCarregado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaUser>(
    `SELECT email, name, balance, pass, last_access, prev_access, settings,
            cpf, nome_completo, data_nascimento, telefone, endereco, dados_bancarios,
            cadastro_completado_em, cadastro_confirmado_em, inadimplente
       FROM ${S}.users
      ORDER BY ord`,
  )
  return rows.map((r) => {
    let cadastro: Cadastro | null = null
    const endereco = json<Endereco>(r.endereco)
    const dadosBancarios = json<DadosBancarios>(r.dados_bancarios)
    if (r.cpf && r.nome_completo && r.data_nascimento && r.telefone && endereco && dadosBancarios) {
      cadastro = {
        cpf: r.cpf,
        nomeCompleto: r.nome_completo,
        dataNascimento: r.data_nascimento,
        telefone: r.telefone,
        endereco,
        dadosBancarios,
        completadoEm: num(r.cadastro_completado_em),
        confirmadoEm: numOuNulo(r.cadastro_confirmado_em) ?? undefined,
      }
    }
    return {
      email: r.email,
      user: {
        name: r.name,
        balance: num(r.balance),
        pass: r.pass,
        lastAccess: numOuNulo(r.last_access),
        prevAccess: numOuNulo(r.prev_access),
        settings: json<UserSettings>(r.settings),
        cadastro,
        inadimplente: Boolean(r.inadimplente),
      },
    }
  })
}

export async function inserirUser(tx: Consulta, email: UserEmail, u: UserRegistro): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.users (
       email, name, balance, pass, last_access, prev_access, settings,
       cpf, nome_completo, data_nascimento, telefone, endereco, dados_bancarios,
       cadastro_completado_em, cadastro_confirmado_em, inadimplente
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15, $16)`,
    [
      email,
      u.name,
      u.balance,
      u.pass,
      u.lastAccess,
      u.prevAccess,
      u.settings ? JSON.stringify(u.settings) : null,
      u.cadastro?.cpf ?? null,
      u.cadastro?.nomeCompleto ?? null,
      u.cadastro?.dataNascimento ?? null,
      u.cadastro?.telefone ?? null,
      u.cadastro?.endereco ? JSON.stringify(u.cadastro.endereco) : null,
      u.cadastro?.dadosBancarios ? JSON.stringify(u.cadastro.dadosBancarios) : null,
      u.cadastro?.completadoEm ?? null,
      u.cadastro?.confirmadoEm ?? null,
      u.inadimplente ?? false,
    ],
  )
}

export async function atualizarUser(tx: Consulta, email: UserEmail, u: UserRegistro): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.users
        SET name = $2,
            balance = $3,
            pass = $4,
            last_access = $5,
            prev_access = $6,
            settings = $7::jsonb,
            cpf = $8,
            nome_completo = $9,
            data_nascimento = $10,
            telefone = $11,
            endereco = $12::jsonb,
            dados_bancarios = $13::jsonb,
            cadastro_completado_em = $14,
            cadastro_confirmado_em = $15,
            inadimplente = $16
      WHERE email = $1`,
    [
      email,
      u.name,
      u.balance,
      u.pass,
      u.lastAccess,
      u.prevAccess,
      u.settings ? JSON.stringify(u.settings) : null,
      u.cadastro?.cpf ?? null,
      u.cadastro?.nomeCompleto ?? null,
      u.cadastro?.dataNascimento ?? null,
      u.cadastro?.telefone ?? null,
      u.cadastro?.endereco ? JSON.stringify(u.cadastro.endereco) : null,
      u.cadastro?.dadosBancarios ? JSON.stringify(u.cadastro.dadosBancarios) : null,
      u.cadastro?.completadoEm ?? null,
      u.cadastro?.confirmadoEm ?? null,
      u.inadimplente ?? false,
    ],
  )
}

/** Nunca acontece hoje — não há tela que apague conta. Existe para o diff ser completo. */
export async function removerUser(tx: Consulta, email: UserEmail): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.users WHERE email = $1`, [email])
}

/**
 * Renomeia a chave primária de um usuário (`email`) em transação atômica.
 *
 * E-mail é chave estrangeira em múltiplas tabelas da plataforma (coins, envios,
 * faturas, saques, planos, etc.). Para não violar as restrições de chave
 * estrangeira:
 *  1. Confere se o novo e-mail já existe;
 *  2. Insere a nova linha em `aurea.users` clonando os dados do e-mail anterior;
 *  3. Reponta todas as tabelas dependentes do e-mail antigo para o novo;
 *  4. Remove a linha do e-mail antigo em `aurea.users`;
 *  5. Registra o evento na trilha de auditoria (`audit_log`).
 */
export async function renomearEmailUsuarioNoBanco(
  tx: Consulta,
  antigoEmail: UserEmail,
  novoEmail: UserEmail,
  novoNome?: string,
  novaSenha?: string,
): Promise<void> {
  const S = nomeDoSchema()
  const de = antigoEmail.trim().toLowerCase()
  const para = novoEmail.trim().toLowerCase()

  if (de === para) return

  // 1. Confere se o e-mail novo já existe
  const { rows: existente } = await tx.query<{ email: string }>(
    `SELECT email FROM ${S}.users WHERE email = $1`,
    [para],
  )
  if (existente.length > 0) {
    throw new Error('Já existe uma conta com este e-mail.')
  }

  // 2. Insere o novo usuário copiando os dados do antigo (ou default se não existia linha em users)
  const { rows: antigo } = await tx.query<{ email: string }>(
    `SELECT email FROM ${S}.users WHERE email = $1`,
    [de],
  )

  if (antigo.length > 0) {
    await tx.query(
      `INSERT INTO ${S}.users (
         email, name, balance, pass, last_access, prev_access, settings,
         cpf, nome_completo, data_nascimento, telefone, endereco, dados_bancarios,
         cadastro_completado_em, cadastro_confirmado_em, inadimplente
       )
       SELECT $2,
              COALESCE($3, name),
              balance, COALESCE($4, pass), last_access, prev_access, settings,
              cpf, nome_completo, data_nascimento, telefone, endereco, dados_bancarios,
              cadastro_completado_em, cadastro_confirmado_em, inadimplente
         FROM ${S}.users
        WHERE email = $1`,
      [de, para, novoNome ? novoNome.trim() : null, novaSenha ?? null],
    )
  } else {
    await tx.query(
      `INSERT INTO ${S}.users (email, name, balance, pass)
       VALUES ($1, $2, 0, $3)`,
      [para, novoNome?.trim() || para, novaSenha ?? null],
    )
  }

  // 3. Atualiza todas as tabelas dependentes
  await tx.query(`UPDATE ${S}.coins SET owner_email = $2 WHERE owner_email = $1`, [de, para])
  await tx.query(`UPDATE ${S}.sell_offers SET seller = $2 WHERE seller = $1`, [de, para])
  await tx.query(`UPDATE ${S}.buy_orders SET buyer = $2 WHERE buyer = $1`, [de, para])
  await tx.query(`UPDATE ${S}.trades SET buyer = $2 WHERE buyer = $1`, [de, para])
  await tx.query(`UPDATE ${S}.trades SET seller = $2 WHERE seller = $1`, [de, para])
  await tx.query(`UPDATE ${S}.envios SET user_email = $2 WHERE user_email = $1`, [de, para])
  await tx.query(`UPDATE ${S}.deposits SET user_email = $2 WHERE user_email = $1`, [de, para])
  await tx.query(`UPDATE ${S}.ledger_entries SET user_email = $2 WHERE user_email = $1`, [de, para])
  await tx.query(`UPDATE ${S}.saques SET user_email = $2 WHERE user_email = $1`, [de, para])
  await tx.query(`UPDATE ${S}.faturas_custodia SET user_email = $2 WHERE user_email = $1`, [de, para])
  await tx.query(`UPDATE ${S}.planos_custodia SET user_email = $2 WHERE user_email = $1`, [de, para])
  await tx.query(`UPDATE ${S}.retiradas SET user_email = $2 WHERE user_email = $1`, [de, para])
  await tx.query(`UPDATE ${S}.payment_intents SET user_email = $2 WHERE user_email = $1`, [de, para])

  const { rows: rAceites } = await tx.query<{ existe: string | null }>(
    `SELECT to_regclass($1)::text AS existe`,
    [`${S}.aceites_documentos`],
  )
  if (rAceites[0]?.existe) {
    await tx.query(`UPDATE ${S}.aceites_documentos SET user_email = $2 WHERE user_email = $1`, [de, para])
  }

  const { rows: rAnalises } = await tx.query<{ existe: string | null }>(
    `SELECT to_regclass($1)::text AS existe`,
    [`${S}.analises_fisicas`],
  )
  if (rAnalises[0]?.existe) {
    await tx.query(`UPDATE ${S}.analises_fisicas SET operador = $2 WHERE operador = $1`, [de, para])
  }

  // 4. Remove o usuário antigo
  await tx.query(`DELETE FROM ${S}.users WHERE email = $1`, [de])

  // 5. Linha de auditoria
  await tx.query(
    `INSERT INTO ${S}.audit_log (created_at, ator, acao, entidade, entidade_id, usuarios_afetados, detalhes)
     VALUES ($1, $2, 'usuario.trocar_email', 'usuario', $3, ARRAY[$4, $5], $6::jsonb)`,
    [
      Date.now(),
      de,
      para,
      de,
      para,
      JSON.stringify({ de, para, alterouNome: Boolean(novoNome) }),
    ],
  ).catch((err) => console.warn('[usuarios] auditoria de troca de e-mail:', err))
}

/**
 * Atualiza o AppState em memória / store contingência ao renomear o e-mail de um usuário.
 */
export function renomearEmailNoAppState(
  s: AppState,
  antigoEmail: string,
  novoEmail: string,
  novoNome?: string,
  novaSenha?: string,
): void {
  const de = antigoEmail.trim().toLowerCase()
  const para = novoEmail.trim().toLowerCase()
  if (de === para) return

  const u = s.users[de]
  if (u) {
    s.users[para] = {
      ...u,
      name: novoNome?.trim() || u.name,
      pass: novaSenha !== undefined ? novaSenha : u.pass,
    }
    delete s.users[de]
  }

  // Ofertas de venda
  if (Array.isArray(s.sellOffers)) {
    for (const o of s.sellOffers) {
      if (o.seller === de) o.seller = para
    }
  }

  // Ordens de compra
  if (Array.isArray(s.buyOrders)) {
    for (const b of s.buyOrders) {
      if (b.buyer === de) b.buyer = para
    }
  }

  // Trades
  if (Array.isArray(s.trades)) {
    for (const t of s.trades) {
      if (t.buyer === de) t.buyer = para
      if (t.seller === de) t.seller = para
    }
  }

  // Envios
  if (Array.isArray(s.envios)) {
    for (const e of s.envios) {
      if (e.userEmail === de) e.userEmail = para
    }
  }

  // Depósitos
  if (Array.isArray(s.deposits)) {
    for (const d of s.deposits) {
      if (d.userEmail === de) d.userEmail = para
    }
  }

  // Saques
  if (Array.isArray(s.saques)) {
    for (const sq of s.saques) {
      if (sq.userEmail === de) sq.userEmail = para
    }
  }

  // Faturas de custódia
  if (Array.isArray(s.faturasCustodia)) {
    for (const f of s.faturasCustodia) {
      if (f.userEmail === de) f.userEmail = para
    }
  }

  // Planos de custódia
  const sComPlanos = s as AppState & { planosCustodia?: Array<{ userEmail: string }> }
  if (Array.isArray(sComPlanos.planosCustodia)) {
    for (const p of sComPlanos.planosCustodia) {
      if (p.userEmail === de) p.userEmail = para
    }
  }

  // Retiradas
  const sComRetiradas = s as AppState & { retiradas?: Array<{ userEmail: string }> }
  if (Array.isArray(sComRetiradas.retiradas)) {
    for (const r of sComRetiradas.retiradas) {
      if (r.userEmail === de) r.userEmail = para
    }
  }

  // Payment intents
  const sComPI = s as AppState & { paymentIntents?: Array<{ userEmail: string }> }
  if (Array.isArray(sComPI.paymentIntents)) {
    for (const pi of sComPI.paymentIntents) {
      if (pi.userEmail === de) pi.userEmail = para
    }
  }
}


