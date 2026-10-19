# VisaQuest — multiplayer classroom edition

A magyar nyelvű, valós idejű, többjátékos vízumpolitikai szimuláció. Node.js + Express + Socket.IO. A játékosok saját eszközről, közös szobakóddal csatlakoznak; a kérdés és a 30 másodperces határidő szinkronizált, a döntések és mutatók játékosonként külön futnak.

## Indítás helyben

1. Telepíts Node.js 18 vagy újabb verziót.
2. Csomagold ki a ZIP-et, majd a mappában futtasd:
   ```bash
   npm install
   npm start
   ```
3. Nyisd meg a `http://localhost:3000` címet. Ugyanazon a gépen a host hozza létre a szobát, a többiek ugyanazzal a helyi címmel csatlakozhatnak, ha ugyanazon a hálózaton vannak. Szemináriumi résztvevők külön hálózatból való csatlakozásához internetes hosztolás szükséges.

## Internetes publikálás (pl. Render)

1. Töltsd fel a kicsomagolt projektet egy privát vagy nyilvános GitHub-repozitóriumba.
2. A hoszting szolgáltatónál hozz létre új **Web Service**-t a repóból.
3. Build command: `npm install`; Start command: `npm start`.
4. Node.js környezet, legalább Node 18; a szolgáltató által megadott HTTPS URL-t oszd meg a résztvevőkkel.
5. Teszteld legalább két külön böngészővel/eszközzel, mielőtt szemináriumon használod.

A hosztolás szolgáltatói fiókot és internetes telepítést igényel; ez a csomag önmagában nem egy már publikált, nyilvános URL. A szobák a szerver memóriájában élnek, így a szerver újraindítása törli őket. A projekt demóhoz készült, nem biztonságkritikus vagy nagy terhelésű alkalmazás.

## Szakmai megjegyzések

- A hét kérdés és az országprofilok a korábbi prototípusból származnak.
- A mutatók 0–100 közé vannak korlátozva; a hatások didaktikai feltételezések, nem empirikus becslések.
- A vízummentesség nem automatikus belépési jog; a vízum, belépés és tartózkodás külön kérdések lehetnek.
- A menedékjogi kérdés külön kezeli a jogi kötelezettségeket; a játék nem modellezi részletesen a tényleges menekültügyi eljárást.
- A végső rangsor a négy mutató egyszerű átlagát használja, és nem jelenti azt, hogy egyetlen stratégia minden körülmények között jobb.
