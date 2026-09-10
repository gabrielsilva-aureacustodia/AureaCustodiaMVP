/**
 * A ponte entre a tela e o processo principal.
 *
 * É a lista COMPLETA do que a tela consegue fazer fora dela mesma. Nada de
 * `require`, nada de `fs`, nada de `fetch` para endereço arbitrário: a tela
 * chama estas funções e nenhuma outra. Se um dia alguém precisar de algo novo,
 * o nome tem que aparecer aqui — e é justamente por isso que a lista é o lugar
 * certo para revisar segurança neste programa.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('estacao', {
  config: {
    ler: () => ipcRenderer.invoke('config:ler'),
    gravar: (nova) => ipcRenderer.invoke('config:gravar', nova),
  },
  site: {
    ping: () => ipcRenderer.invoke('site:ping'),
    fila: () => ipcRenderer.invoke('site:fila'),
    abrir: (protocolo) => ipcRenderer.invoke('site:abrir', protocolo),
    fechar: (carga) => ipcRenderer.invoke('site:fechar', carga),
  },
  fila: {
    processar: () => ipcRenderer.invoke('fila:processar'),
    contar: () => ipcRenderer.invoke('fila:contar'),
    // O processo principal avisa quando a fila anda sozinha, a cada minuto.
    aoMudar: (cb) => ipcRenderer.on('fila:mudou', (_e, dados) => cb(dados)),
  },
  video: {
    gravar: (protocolo, indice, buffer, extensao) =>
      ipcRenderer.invoke('video:gravar', { protocolo, indice, buffer, extensao }),
  },
  pasta: {
    abrir: (qual) => ipcRenderer.invoke('pasta:abrir', qual),
  },
})
