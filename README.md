# 🏠 Tarefas da Família

Sistema de gerenciamento de tarefas domésticas para toda a família com gamificação e sincronização em tempo real.

## ✨ Funcionalidades

### 🎯 **Sistema de Gamificação**
- **Pontos para crianças** - Motivação através de recompensas
- **Tarefas dos adultos** - Organização sem pontuação
- **Som de vitória** - Celebração ao completar tarefas
- **Animações** - Interface divertida e interativa

### 👨‍👩‍👧‍👦 **Multi-usuário**
- **Login com Google** - Autenticação segura
- **Famílias isoladas** - Cada família vê apenas suas tarefas
- **Perfis personalizados** - Avatars e cores únicas

### 🔄 **Tempo Real**
- **Sincronização automática** - Funciona em múltiplos dispositivos
- **Updates instantâneos** - Veja mudanças ao vivo
- **Offline-first** - Continue usando mesmo sem internet

### 📱 **Responsivo**
- **Mobile-first** - Otimizado para celular
- **Tablet e desktop** - Funciona em qualquer tela
- **PWA Ready** - Pode ser instalado como app

## 🚀 Como Usar

### 1. **Configurar Firebase**
Siga as instruções detalhadas no arquivo [`FIREBASE_SETUP.md`](./FIREBASE_SETUP.md)

### 2. **Instalar Dependências**
```bash
npm install
```

### 3. **Configurar Variáveis de Ambiente**
Copie `.env.local.example` para `.env.local` e configure suas chaves do Firebase

### 4. **Executar em Desenvolvimento**
```bash
npm run dev
```

### 5. **Acessar a Aplicação**
Abra [http://localhost:3000](http://localhost:3000) no seu navegador

## 🛠️ Tecnologias

- **[Next.js 15](https://nextjs.org)** - Framework React com App Router
- **[React 19](https://react.dev)** - Biblioteca UI com Server Components
- **[TypeScript](https://typescriptlang.org)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com)** - Styling
- **[Firebase](https://firebase.google.com)** - Backend-as-a-Service
  - **Authentication** - Login com Google
  - **Firestore** - Banco de dados NoSQL
  - **Real-time updates** - Sincronização automática
- **[ShadCN/UI](https://ui.shadcn.com)** - Componentes
- **[Framer Motion](https://framer.com/motion)** - Animações
- **[Zustand](https://zustand-demo.pmnd.rs)** - State management

## 📁 Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 13+)
│   ├── login/             # Página de login
│   ├── page.tsx           # Página principal
│   └── layout.tsx         # Layout global
├── components/            # Componentes reutilizáveis
│   ├── ui/               # Componentes base (ShadCN)
│   ├── tasks/            # Componentes de tarefas
│   └── common/           # Componentes comuns
├── services/             # Serviços e APIs
│   ├── firestore-task-service.ts
│   ├── family-service.ts
│   └── calendar-service.ts
├── providers/            # Context providers
│   └── auth-provider.tsx
├── hooks/                # Custom hooks
│   └── useAuth.ts
├── lib/                  # Utilities e configurações
│   ├── firebase.ts       # Config Firebase
│   └── utils.ts          # Funções utilitárias
└── types/                # Definições TypeScript
```

## 🎮 Como Funciona

### **Para Crianças**
1. **Fazem login** com conta Google dos pais
2. **Selecionam seu perfil** (Louise ou Benício)
3. **Completam tarefas** arrastando ou clicando
4. **Ganham pontos** e ouvem som de vitória
5. **Veem seu progresso** em tempo real

### **Para Adultos**
1. **Fazem login** com sua conta Google
2. **Gerenciam tarefas** da família
3. **Acompanham progresso** das crianças
4. **Criam novas tarefas** conforme necessário
5. **Veem relatórios** e estatísticas

### **Sistema de Família**
- Cada conta Google cria uma **família única**
- **ID da família** é gerado automaticamente
- **Membros da família** compartilham as mesmas tarefas
- **Dados isolados** entre diferentes famílias

## 🔒 Segurança

- **Autenticação obrigatória** - Só usuários logados acessam
- **Regras Firestore** - Validação server-side
- **Dados isolados** - Famílias não veem dados umas das outras
- **HTTPS obrigatório** - Comunicação segura

## 📊 Recursos Futuros

- [ ] **Relatórios detalhados** - Gráficos de progresso
- [ ] **Sistema de recompensas** - Troca de pontos por prêmios
- [ ] **Notificações push** - Lembretes de tarefas
- [ ] **Calendário integrado** - Agendamento de tarefas
- [ ] **Fotos de comprovação** - Upload de imagens
- [ ] **Chat da família** - Comunicação interna
- [ ] **Integração com assistentes** - Alexa/Google Assistant

## 🚀 Deploy

### **Vercel (Recomendado)**
1. Faça push para GitHub
2. Conecte repositório na Vercel
3. Configure variáveis de ambiente
4. Deploy automático!

### **Outras Opções**
- **Netlify** - Para sites estáticos
- **Firebase Hosting** - Integração nativa
- **Railway** - Deploy com database

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 💝 Agradecimentos

- **Next.js team** - Framework incrível
- **Firebase team** - Backend poderoso
- **ShadCN** - Componentes lindos
- **Vercel** - Deploy gratuito
- **Minha família** - Inspiração para o projeto! 👨‍👩‍👧‍👦

---

**Feito com ❤️ para organizar a casa e motivar as crianças!**
