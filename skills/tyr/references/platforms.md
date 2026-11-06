# Plataformas

## GitHub (`gh`)

URL: `https://github.com/{owner}/{repo}/pull/{n}`.

| Paso | Comando |
| --- | --- |
| Metadatos | `gh pr view {url} --json number,title,body,headRefName,baseRefName,headRefOid,author,url` |
| Usuario actual | `gh api user -q .login` |
| Diff | `gh pr diff {url}` (unified, lado nuevo = `+`) |
| Archivo en head | `gh api "repos/{owner}/{repo}/contents/{path}?ref={sha}" -H "Accept: application/vnd.github.raw"` |
| Comentarios inline | `gh api repos/{owner}/{repo}/pulls/{n}/comments --paginate` (`id`, `path`, `line`, `original_line`, `commit_id`, `body`, `in_reply_to_id`) |
| Hilos (para resolver) | GraphQL `repository.pullRequest(number).reviewThreads(first:100){nodes{id isResolved isOutdated comments(first:1){nodes{databaseId}}}}` |
| Responder en hilo | `gh api repos/{owner}/{repo}/pulls/{n}/comments/{id}/replies -f body=@-` |
| Resolver hilo | `gh api graphql -f query='mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{isResolved}}}' -f t={threadId}` |
| Publicar revisión | `gh api repos/{owner}/{repo}/pulls/{n}/reviews --input review.json` |

`review.json` lleva los comentarios inline nuevos, el resumen y el veredicto en una sola llamada:

```json
{
  "commit_id": "{headRefOid}",
  "event": "APPROVE | REQUEST_CHANGES",
  "body": "{assets/summary.md}",
  "comments": [
    { "path": "src/a.php", "line": 42, "side": "RIGHT", "start_line": 40, "start_side": "RIGHT", "body": "{assets/comment.md}" }
  ]
}
```

- Omite `start_line`/`start_side` en comentarios de una línea.
- GitHub no deja aprobar ni pedir cambios en una PR propia: si `author.login` == usuario actual, usa `"event": "COMMENT"` y dilo en la salida.
- Escribe `review.json` en el scratchpad, no en el repo.

## Bitbucket (MCP Atlassian)

URL: `https://bitbucket.org/{workspace}/{repo}/pull-requests/{n}`. `workspaceId` = workspace, `repoId` = repo, `prId` = n (número).

Usa solo nombres devueltos por `discover`. Estos existen hoy:

| Paso | Operación | Herramienta |
| --- | --- | --- |
| Metadatos (rama, head SHA, autor) | `getBitbucketRepoPullRequest` | `executeRead` |
| Diff | `getBitbucketRepoPullRequestDiff` | `executeRead` |
| Comentarios | `listBitbucketRepoPullRequestComments` (`pagelen: 100`, itera `page`) | `executeRead` |
| Comentario inline | `addBitbucketRepoPullRequestComment` con `content`, `inlinePath`, `inlineToLine` (+ `inlineToLineStart` si es rango) | `executeWrite` |
| Responder en hilo | `addBitbucketRepoPullRequestComment` con `parentCommentId` | `executeWrite` |
| Resumen | `addBitbucketRepoPullRequestComment` sin `inline*` | `executeWrite` |
| Resolver hilo | `resolveBitbucketRepoPullRequestComment` (`commentId` del comentario raíz) | `executeWrite` |
| Aprobar | `approveBitbucketRepoPullRequest` | `executeWrite` |
| Pedir cambios | `requestChangesOnBitbucketRepoPullRequest` | `executeWrite` |

- Pasa `cloudId` (de `getAccessibleAtlassianResources`) si la herramienta lo exige.
- Bitbucket no tiene bloques `suggestion`: el fix va como bloque de código normal.
- Contenido de un archivo en head: `discover` "get file source from bitbucket repository"; si no hay operación, usa un checkout local con `git fetch origin {rama} && git show {sha}:{path}`.
- Cambio de veredicto: si Tyr pidió cambios antes y ahora aprueba (o al revés), `discover` "remove request changes" / "unapprove bitbucket pull request" y retira el estado anterior antes de poner el nuevo, si la operación existe.
- Si un comentario inline falla porque la línea no está en el diff, no lo reintentes como comentario general: descártalo y repórtalo.
