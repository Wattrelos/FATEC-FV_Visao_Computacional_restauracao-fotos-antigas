# 🖼️ RestauraFoto: recupera fotos antigas de família

Restaura fotos escaneadas, que costumam estar amareladas, riscadas e desbotadas.

* Mediana e gaussiano para tirar riscos e granulação; equalização e brilho/contraste para recuperar o desbotado
* HSV e splitting de canais para corrigir o amarelado; histograma antes e depois
* Binarização e morfologia (dilatação) para criar a máscara de riscos, seguida de cv2.inpaint
* Crescimento de regiões para selecionar manchas a partir de um clique
* Reconhecimento facial para detectar e etiquetar os parentes ("álbum inteligente")
* Subtração para mostrar a diferença entre a original e a restaurada
Diferencial: apelo emocional forte e um antes/depois muito visual.


