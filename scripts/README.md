# Scripts de backup e migração do Firestore

Dois scripts rodados **à mão**, contra o Firebase real, na ordem abaixo. Eles implementam a
seção 5 do `docs/design-modulo-dados.md` (migração do modelo antigo para o esquema v2).

| Arquivo | O que faz |
|---|---|
| `backup-firestore.ts` | Despeja `families/**` e `users/**` num JSON local. É a âncora de reversibilidade. |
| `migrate-firestore.ts` | Migra para o esquema v2. **Dry-run por padrão**; só escreve com `--apply`. |
| `firestore-cli.ts` | Base comum dos dois: `.env.local`, conexão, descoberta de famílias, serialização. |

As regras do Firestore do projeto estão abertas, então o **SDK cliente basta** — não é
necessária credencial de service account.

---

## Antes de tudo

1. **`.env.local` na raiz do projeto** (`family-tasks-web/`) com as 6 variáveis que o app já
   usa. Variável **em branco vale como ausente**: o script aborta listando quais faltam.

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

2. **Acrescente `backups/` ao `.gitignore`.** O backup contém as tarefas e o histórico de
   pontos reais das crianças — não pode ir para o repositório.

3. Nenhuma dependência nova: os scripts rodam com `npx --yes tsx`, que baixa o `tsx` sob
   demanda na primeira execução (precisa de rede nessa primeira vez).

---

## Passo a passo

### Passo 1 — Backup (obrigatório, sempre)

```bash
npm run backup:firestore
```

**O que observar na saída:**

- a lista de **famílias varridas** — deve incluir `default_family` (a home sempre escreveu
  nela) e o `familyId` de cada usuário do login;
- a **contagem por coleção**. É este número que você vai comparar depois. Anote pelo menos:
  `families/<X>/tasks`, `families/<Y>/task_templates`, `families/<Y>/task_instances`;
- o **caminho do arquivo** gerado, em `backups/backup-<carimbo>.json`.

**Se `families/<algo>/tasks` vier 0 em todas as famílias**, pare: ou a hipótese sobre onde os
dados estão é falsa, ou você está conectado no projeto Firebase errado. Confira o
`NEXT_PUBLIC_FIREBASE_PROJECT_ID` impresso na primeira linha.

> ⚠️ **Limite conhecido:** o SDK cliente **não enumera subcoleções** (`listCollections` é só do
> Admin SDK). O backup varre a lista conhecida — `tasks`, `task_templates`, `task_instances`,
> `daily_checks`, `members`, `days`. Se você souber de outra, passe
> `--subcolecoes=nome_da_outra`. O arquivo registra essa ressalva em `avisos`.

### Passo 2 — Dry-run da migração (não escreve nada)

```bash
npm run migrate:firestore
```

**O que observar, em ordem:**

1. **"Passo 0 — o que existe hoje"** — confirma (ou derruba) a hipótese de que os dados estão
   espalhados em duas famílias. Você verá cada `familyId` com as contagens por subcoleção.
   O script **para** se mais de duas famílias tiverem dados.
2. **"família canônica"** — o `familyId` escolhido. Se o script não conseguir decidir
   (vários usuários com `familyId` diferentes), ele para e pede `--family-id=<id>`.
3. **"Passos 2 a 5 — o que será escrito"** — quantos templates serão criados, quantos apenas
   completados com `audience`/`days_of_week`, quantos docs `days` e quantos itens.
4. **"Duplicados unificados"** — cada nome que apareceu em mais de uma família/coleção e foi
   colapsado num template só. Leia: é aqui que um nome mal digitado vira template separado.
5. **"NÃO migrados"** — deve estar **vazio**. Se aparecer alguma linha, a migração já sai com
   código != 0 e você não deve prosseguir sem entender o caso.
6. **"Verificação obrigatória"** — as contagens antes × depois e a soma de pontos por membro.
   Toda linha de pontos precisa dizer `ok`.

**Critério para seguir:** o comando termina com código de saída **0** e imprime
`Dry-run conferido`. Confira com `echo $?`.

### Passo 3 — Aplicar

```bash
npm run migrate:firestore:apply
```

Escreve **apenas** em: `families/{canonico}` (merge), `families/{canonico}/members`,
`families/{canonico}/task_templates` e `families/{canonico}/days`.

**O que observar:**

- `points_total recalculado: louise=… benicio=… adult1=… adult2=…`;
- a **"Verificação obrigatória (dias relidos do Firestore)"** — desta vez os números vêm de
  uma releitura do banco, não do plano em memória. É a prova de que a escrita chegou lá;
- o código de saída. **Diferente de 0 = NÃO prossiga com o cutover.**

### Passo 4 — Fixar o `familyId` na Vercel

A última seção da saída imprime a linha pronta:

```
→ coloque na Vercel:  NEXT_PUBLIC_FAMILY_ID=<canonico>
```

`NEXT_PUBLIC_*` é **embutido no build**, não lido em execução: mudar a variável no painel
**não basta** — é preciso um **redeploy** para o valor entrar no bundle.

### Passo 5 — Validar o painel

Abra o painel, conclua uma tarefa de criança, **recarregue a página** e veja a conclusão e o
placar persistidos. Só depois disso a migração conta como boa.

---

## Opções de linha de comando

| Opção | Vale para | Efeito |
|---|---|---|
| `--apply` | migrate | Escreve de verdade. Sem ela, é dry-run. |
| `--family-id=<id>` | migrate | Força o `familyId` canônico em vez de deduzir. |
| `--backup=<caminho>` | migrate | Usa um backup específico em vez do mais recente de `backups/`. |
| `--aceitar-varias-familias` | migrate | Segue mesmo com mais de 2 famílias com dados. |
| `--familias=a,b` | ambos | Sonda famílias adicionais que a descoberta automática não achou. |
| `--subcolecoes=x,y` | ambos | Varre subcoleções além das conhecidas. |
| `--saida=<pasta>` | backup | Pasta de destino (padrão `backups`). |

Sem os scripts npm, é o mesmo comando: `npx --yes tsx scripts/migrate-firestore.ts --apply`.

---

## Por que dá para rodar duas vezes (idempotência)

- Os **ids dos `DayItem` são determinísticos**: o id do documento antigo (a tarefa ou a
  instância). O mesmo dado nunca gera dois itens.
- Os **ids dos docs `days` são a própria data** (`YYYY-MM-DD`), então não há como duplicar
  um dia.
- Os **ids dos templates criados são o id do doc de origem**, e a deduplicação por nome
  normalizado usa uma ordem fixa (canônico → outras famílias → tarefas permanentes).
- Ao mesclar um dia, **o item que já está no banco sempre vence** — nunca sobrescrevemos
  estado vivo (alguém pode ter des-completado uma tarefa pelo painel).
- Dia que a migração não muda **não é reescrito**. Numa segunda execução, o número de
  `docs days a gravar` deve ser **0**.
- Nos templates que já vivem na família canônica, o script **só acrescenta** `audience` e
  `days_of_week`, e **só se estiverem faltando**.

---

## Como reverter

A migração é reversível por construção, porque **não altera nem apaga nada do modelo antigo**:
`tasks`, `task_instances`, `daily_checks` e `families/default_family` ficam intactos.

1. **Rollback do software:** volte o front para a versão anterior. Ele lê as coleções antigas,
   que continuam lá exatamente como estavam.
2. **Desfazer o que a migração escreveu** (opcional — o front antigo ignora essas coleções):
   apague no console do Firebase `families/{canonico}/members` e `families/{canonico}/days`, e
   remova os campos `audience`/`days_of_week` dos templates. O `backups/backup-*.json` tem o
   estado exato de antes para conferência.
3. **Janela de decisão: 1 a 2 dias.** Depois do cutover, as conclusões novas passam a existir
   **só** no modelo novo — um rollback tardio perde esses toques.

**Irreversível, e fora do escopo destes scripts:** apagar as coleções antigas. Faça isso à mão,
dias depois, com o painel validado.

---

## Limitações conhecidas (leia antes de estranhar os números)

- **`assigned_date` das instâncias é preservado como está.** O gerador antigo calculava "hoje"
  com `toISOString()`, que é UTC: instância criada depois das 21h no Brasil ficou marcada com a
  data do dia seguinte. A migração **não corrige** isso — reescrever seria inventar dado. Só a
  data derivada de `completed_at` (das tarefas permanentes) é convertida corretamente para
  America/Sao_Paulo.
- **Recorrências `none`, `monthly`, `once`, `custom`** viram templates que o app trata como
  **diários** (é o comportamento do adapter). O script conta e imprime quantos são; revise em
  `/manage-tasks` depois.
- **Instância sem template** (`template removido`) vira item com `templateId: null` e nome
  `(template removido)` — não é descartada. O script lista cada uma.
- **Tarefa permanente pendente** vira template, mas **não** vira item de dia (não há data à
  qual pendurá-la). O script imprime a contagem.
- **`daily_checks` não é migrada** — era log operacional do gerador antigo.
- **Conflito no mesmo dia + mesmo template:** a instância vence, e o item vindo da tarefa
  permanente é descartado. A verificação desconta esses pontos explicitamente, na linha
  `substituídas por instância do mesmo dia`.

---

## Se aparecer "Não consegui ler ... do servidor"

É proposital, e vale saber por quê. Os dois scripts leem **só do servidor**
(`getDocsFromServer`), nunca do cache do SDK.

Verificado aqui em 22/08/2026, com um `projectId` inacessível: a leitura comum (`getDocs`)
**não falha** — o SDK entra em modo offline e devolve `size=0, fromCache=true`. Com isso, o
dry-run imprimia `0 documentos … Dry-run conferido` e saía com código **0**: uma falha total
disfarçada de sucesso. `getDocsFromServer` lança nesse mesmo cenário, que é o certo aqui.

Pelo mesmo motivo:

- o **backup se recusa a gravar um arquivo vazio** — backup de zero documento não protege nada;
- a **migração aborta se a origem estiver vazia** — "nada encontrado" quase sempre é projeto
  ou família errados, não banco vazio.

Se a mensagem aparecer: confira a conexão e o `NEXT_PUBLIC_FIREBASE_PROJECT_ID` do
`.env.local` (ele é impresso na primeira linha de toda execução).

---

## Campos gravados

O armazenamento é **snake_case** — é o que `src/data/firestore-family-data.ts` lê. Gravar
camelCase faria o app não enxergar o dado e a migração viraria perda silenciosa.

- `members/{id}`: `name`, `avatar`, `role`, `color_key`, `points_total`, `active`, `sort_order`
- `days/{YYYY-MM-DD}`: `date`, `family_id`, `created_at`, `generated_by`,
  `template_ids_generated`, `items[]`
- item de `items[]`: `id`, `template_id`, `name`, `icon`, `points`, `audience`, `category`,
  `difficulty`, `estimated_time`, `status`, `completed_by`, `completed_by_name`,
  `completed_at`, `points_earned`
- `task_templates/{id}`: ganha `audience` e `days_of_week`
- `families/{id}`: `timezone`, `schema_version: 2`, `migrated_at` (merge — não apaga o que já
  existe lá; `name` só é escrito se ainda não houver um)
