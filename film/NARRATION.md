# Narration

Manali can voice the film, or not: it's made to work both ways. Without a voice,
the words are on screen, timed as if spoken. With one, Manali's takes play over a
quieter bed of the same score and the words become captions.

There are two scripts, one picture. **Hers** is Daphne telling her own story
("You've seen me on a thousand film posters"), the alternate. **Ours** is pitch.dog
telling it ("You've seen her..."), the lead. Record ours first; hers is optional.

## Reading it

- Unhurried and close, as if to one person in the dark: about 2.5 words a
  second, with real breaths at the full stops. "About" below is that pace.
- Each take starts on its beat and must end before the next one starts:
  "Room" is the time it has. A take can start up to half a second late, never early.
- "Daphne." (L03) is said once, softly, as her name rises on screen.
- L06, "I ran.", lands on the timpani hit. L08 to L10 are three short lines,
  each with a beat of quiet after it.
- Leave each take's breath in, trim the silence, no music under it.

## Files

One WAV per line, 48 kHz, mono or stereo, peaking around -3 dBFS, named by take:
`public/vo/her/L01.wav` ... `L21.wav` for hers, `public/vo/us/L01.wav` ... for ours.
Then render the narrated cut (`npm run render -- DaphneNarrated` or
`DaphneUsNarrated`). Each take plays from its line's beat; a missing take is
simply silent, so a partial set can be checked as it comes in.

If a take runs long, move that line's `beat` (and the next ones) in
`src/story.json` and run `npm run narration` to reprint this sheet; the
picture follows the beats. The score is fixed to the beats too, so rerun
`npm run score` after a retime.

## Hers (Daphne tells it)

| Take | Starts | Room | About | Line |
|---|---|---|---|---|
| L01 | 0:02.8 | 4.6 s | 2.7 s | You’ve seen me on a thousand film posters. |
| L02 | 0:07.4 | 6.9 s | 1.9 s | You never knew my name. |
| L03 | 0:14.3 | 4.6 s | 0.8 s | Daphne. |
| L04 | 0:19.0 | 9.2 s | 4.5 s | I was a river’s daughter, and I wanted to belong to no one. |
| L05 | 0:28.2 | 4.6 s | 2.8 s | Then a god saw me, and wanted me. |
| L06 | 0:32.8 | 2.3 s | 1.0 s | I ran. |
| L07 | 0:35.1 | 7.5 s | 5.8 s | And when I could run no farther, I begged my father, the river, to change me. |
| L08 | 0:42.6 | 2.3 s | 1.4 s | My feet took root. |
| L09 | 0:44.9 | 2.3 s | 1.8 s | My arms became branches. |
| L10 | 0:47.2 | 4.6 s | 1.8 s | My hair became leaves. |
| L11 | 0:51.8 | 6.3 s | 5.3 s | When he laid his hand on the bark, he could still feel my heart, trembling underneath. |
| L12 | 0:58.2 | 5.2 s | 4.2 s | He kissed the wood. Even as wood, I pulled away. |
| L13 | 1:03.4 | 5.8 s | 4.7 s | He couldn’t have me. So he took my leaves, and wore them as a crown. |
| L14 | 1:09.2 | 4.0 s | 3.4 s | Ever since, my leaves have crowned the chosen. |
| L15 | 1:13.2 | 4.6 s | 2.4 s | Poets. Athletes. Artists. |
| L16 | 1:17.8 | 5.8 s | 4.6 s | Now I sit on film posters, and quietly say: this film was chosen. |
| L17 | 1:23.6 | 4.6 s | 3.6 s | But I only ever asked to belong to no one. |
| L18 | 1:28.2 | 2.3 s | 1.7 s | So now, I’m free. |
| L19 | 1:30.5 | 4.6 s | 3.8 s | Free, for every filmmaker who’s earned a laurel. |
| L20 | 1:35.1 | 4.6 s | 3.9 s | No account. No watermark. I keep nothing of yours. |
| L21 | 1:39.7 | 5.8 s | 2.8 s | Your film was chosen. Let it say so. |

## Ours (pitch.dog tells it)

| Take | Starts | Room | About | Line |
|---|---|---|---|---|
| L01 | 0:02.8 | 4.6 s | 2.7 s | You’ve seen her on a thousand film posters. |
| L02 | 0:07.4 | 6.9 s | 2.1 s | You just never knew her name. |
| L03 | 0:14.3 | 4.6 s | 0.8 s | Daphne. |
| L04 | 0:19.0 | 9.2 s | 4.5 s | She was a river’s daughter, and she wanted to belong to no one. |
| L05 | 0:28.2 | 4.6 s | 2.8 s | Then a god saw her, and wanted her. |
| L06 | 0:32.8 | 2.3 s | 1.0 s | She ran. |
| L07 | 0:35.1 | 7.5 s | 5.8 s | And when she could run no farther, she begged her father, the river, to change her. |
| L08 | 0:42.6 | 2.3 s | 1.4 s | Her feet took root. |
| L09 | 0:44.9 | 2.3 s | 1.8 s | Her arms became branches. |
| L10 | 0:47.2 | 4.6 s | 1.8 s | Her hair became leaves. |
| L11 | 0:51.8 | 6.3 s | 5.3 s | When he laid his hand on the bark, he could still feel her heart, trembling underneath. |
| L12 | 0:58.2 | 5.2 s | 4.2 s | He kissed the wood. Even as wood, she pulled away. |
| L13 | 1:03.4 | 5.8 s | 4.7 s | He couldn’t have her. So he took her leaves, and wore them as a crown. |
| L14 | 1:09.2 | 4.0 s | 3.4 s | Ever since, her leaves have crowned the chosen. |
| L15 | 1:13.2 | 4.6 s | 2.4 s | Poets. Athletes. Artists. |
| L16 | 1:17.8 | 5.8 s | 4.6 s | Now she sits on film posters, and quietly says: this film was chosen. |
| L17 | 1:23.6 | 4.6 s | 3.6 s | But she only ever asked to belong to no one. |
| L18 | 1:28.2 | 2.3 s | 1.7 s | So we made her free. |
| L19 | 1:30.5 | 4.6 s | 2.9 s | Daphne makes festival laurels for your film. |
| L20 | 1:35.1 | 4.6 s | 4.1 s | No account. No watermark. Nothing leaves your device. |
| L21 | 1:39.7 | 5.8 s | 2.9 s | For every filmmaker who’s earned one. |

Times are from the start of the film (52 beats a minute, 1:50.0 long).
The ending, from 1:45.5, has no words.
