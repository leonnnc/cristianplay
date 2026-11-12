import { describe, expect, it } from "vitest";
import {
  buildChurchTracks,
  decodeXmlEntities,
  filterChurchTracks,
  parseChurchFeed,
} from "@/lib/church";

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
  <title>Catedral de Fe</title>
  <entry>
    <id>yt:video:AAA111bbb22</id>
    <yt:videoId>AAA111bbb22</yt:videoId>
    <title>Alabanza &amp; adoración en vivo</title>
    <published>2026-11-08T15:00:00+00:00</published>
    <media:group>
      <media:title>Alabanza &amp; adoración en vivo</media:title>
      <media:thumbnail url="https://i.ytimg.com/vi/AAA111bbb22/hqdefault.jpg" width="480" height="360"/>
      <media:description>Servicio de adoración desde Catedral de Fe.</media:description>
    </media:group>
  </entry>
  <entry>
    <id>yt:video:CCC333ddd44</id>
    <yt:videoId>CCC333ddd44</yt:videoId>
    <title>Predicación: el poder de la fe</title>
    <published>2026-11-05T02:00:00+00:00</published>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/CCC333ddd44/hqdefault.jpg" width="480" height="360"/>
    </media:group>
  </entry>
</feed>`;

describe("parseChurchFeed", () => {
  it("extrae y ordena los videos del feed", () => {
    const entries = parseChurchFeed(FEED);
    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe("AAA111bbb22");
    expect(entries[0].title).toBe("Alabanza & adoración en vivo");
    expect(entries[0].thumbnail).toContain("AAA111bbb22");
    expect(entries[0].publishedAt).toBe(
      new Date("2026-11-08T15:00:00+00:00").getTime(),
    );
    expect(entries[1].id).toBe("CCC333ddd44");
  });

  it("decodifica entidades XML", () => {
    expect(decodeXmlEntities("Fe &amp; Avivamiento &#39;26")).toBe(
      "Fe & Avivamiento '26",
    );
  });
});

describe("buildChurchTracks", () => {
  it("marca los videos como contenido del canal", () => {
    const tracks = buildChurchTracks(parseChurchFeed(FEED));
    expect(tracks).toHaveLength(2);
    expect(tracks.every((track) => track.source === "channel")).toBe(true);
    expect(tracks.every((track) => track.channel === "Catedral de Fe")).toBe(
      true,
    );
  });

  it("filtra por categoría dejando pasar coincidencias por texto", () => {
    const tracks = buildChurchTracks(parseChurchFeed(FEED));
    const predicaciones = filterChurchTracks(tracks, "predicacion");
    expect(predicaciones.some((track) => track.id === "CCC333ddd44")).toBe(
      true,
    );
    expect(filterChurchTracks(tracks, "todas")).toHaveLength(2);
  });
});
