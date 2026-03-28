# Contributing to Vela Desktop App

First off, thanks for taking the time to contribute! Vela is an open-source project and we welcome contributions that follow our technical stack and minimalist philosophy.

## Como Contribuir

A maneira mais indicada para se envolver é através de _Pull Requests_ (PRs). Caso você deseje trabalhar em uma nova feature robusta que modifique a arquitetura do projeto ou necessite de refatoração, discuta a ideia **abrindo uma Issue antes**.

### Dicas de Contribuição (Best Practices)

1. **Faça um Fork e Clone:** Comece bifurcando este repositório no seu GitHub, clonando-o para desenvolvimento.
2. **Nova Branch Mínima:** 
   - Nomeie sua branch com um padrão semântico, como `feat/adicionar-filtro` ou `fix/botao-hover`.
   - Evite acumular muitas alterações numa única branch; prefira escopos limpos.
3. **Commit Semântico (Conventional Commits):**
   Mantenha a padronização angular nos commits para geração automatica de Changelogs:
   - `feat:` Uma nova feature no código.
   - `fix:` Uma correção de bug.
   - `chore:` Alterações pontuais de configuração, linting ou CI/CD (sem afetar prod).
   - `docs:` Modificações aplicadas à documentação (.md files).
   - `refactor:` Alterações arquiteturais do código sem mudar as lógicas centrais para o usuário final.
4. **Padrão de Código:**
   - Execute sempre `npm run lint` ou ferramentas formatadoras locais (Prettier).
   - Mantenha a estilização de CSS mínima e limpa proposta em `index.css`. Evite adicionar Tailwind ou injetar variáveis opacas; utilize `--var` atrelada ao Ant Design.
   - No caso do Python (`src-tauri/python`), obedeça a tipagem estática leve e adote os princípios da stdlib (`json`, `sys`, etc) sem onerar dependências externas desnecessariamente.
5. **Testes e Build Local Responsável:** Em atualizações na parte front-end (React), tenha certeza de rodar `npm run build` e confirmar aderência à build de produção. Teste o projeto completo usando `npm run tauri dev`.

### Criando seu Pull Request (PR)

- Ao abrir um PR, documente o **antes e depois** em _screenshots_ se houver alteração visual (Vela zela por performance e foco na estética flat-minimalista).
- Referencie sempre o número da _Issue_ ligada ao seu PR (`Closes #123`).
- Dê contexto do *porquê* da sua solução nas descrições.

### Código de Conduta

Ao participar deste repositório, exige-se que todo e qualquer mantenedor se comporte com respeito e fomento ao ecossistema open-source de forma plural e diversificada. Nós seguimos o pacto padrão do Contributor Covenant Code of Conduct.

Se tiver qualquer problema, reporte à administração do repositório.
