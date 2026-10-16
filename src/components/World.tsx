import type { World as WorldState, WorldObject } from "../../shared/engine";
import { labels } from "../../shared/engine";
import { Pet, type Mood } from "./Pet";

function Tree({
  x,
  y,
  s = 1,
  tone = "#8fbb9e",
}: {
  x: number;
  y: number;
  s?: number;
  tone?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M0 150L6 53"
        stroke="#ab9d79"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M4 45C-31-10-57 39-34 60C-77 54-62 112-29 105C-49 143-9 153 7 125C40 156 65 120 38 100C84 92 54 45 29 59C50 15 3 3 4 45"
        fill={tone}
      />
      <path
        d="M5 120L-21 91M5 103L32 77M5 81L-14 54"
        fill="none"
        stroke="#fff"
        opacity=".22"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  );
}
export function ObjectArt({ kind }: { kind: WorldObject }) {
  return (
    <svg viewBox="0 0 90 70" aria-label={labels[kind]} role="img">
      {kind === "rice" && (
        <>
          <ellipse cx="45" cy="52" rx="34" ry="12" fill="#d9d0ee" />
          <path
            d="M17 43Q21 11 45 20Q70 12 76 43"
            fill="#fffdfa"
            stroke="#e5dec7"
            strokeWidth="2"
          />
          <path d="M16 42Q45 55 76 42L68 57Q43 72 23 56Z" fill="#b7a4d8" />
          <g stroke="#e7dfc8" strokeWidth="2">
            <path d="M30 30l4 3m9-10l-2 4m14 3l4 1m-14 5l4 3m-23 0l4 3m29-2l4-4" />
          </g>
        </>
      )}
      {kind === "fish" && (
        <>
          <ellipse cx="45" cy="54" rx="39" ry="9" fill="#f5f0de" />
          <path d="M12 39L28 26Q56 8 75 32Q62 61 29 43L12 51Z" fill="#8fbebd" />
          <circle cx="64" cy="31" r="3" fill="#436c70" />
          <path
            d="M48 22Q37 32 48 45M34 25L37 21"
            stroke="#629e9e"
            strokeWidth="3"
            fill="none"
          />
        </>
      )}
      {kind === "mango" && (
        <>
          <path d="M53 15C82 22 72 58 42 62C5 62 21 22 43 20Z" fill="#efbe59" />
          <path d="M50 21Q39 1 68 8Q67 23 50 21" fill="#78a776" />
          <path
            d="M33 33Q22 44 30 49"
            stroke="#ffe294"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
      {kind === "water" && (
        <>
          <path
            d="M24 10L29 61H62L68 10Z"
            fill="#d6edf3"
            stroke="#80b8c7"
            strokeWidth="2"
          />
          <path d="M28 32Q43 39 64 30L61 58H32Z" fill="#92cfdc" />
          <path
            d="M38 38V51"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "bridge" && (
        <>
          <path
            d="M8 53Q46 15 84 53"
            fill="none"
            stroke="#ba9372"
            strokeWidth="12"
          />
          <path
            d="M8 42Q46 4 84 42M13 47V32M32 31V20M56 32V20M78 46V32"
            stroke="#aa815e"
            strokeWidth="4"
            fill="none"
          />
        </>
      )}
      {kind === "boat" && (
        <>
          <path d="M7 45H83L65 64H27Z" fill="#bc916d" />
          <path d="M46 8V46H17Z" fill="#faf2d8" />
          <path d="M49 12V44H73Z" fill="#aa9bcf" />
        </>
      )}
      {kind === "flower" && (
        <>
          <path
            d="M45 35V66M45 57Q19 44 29 42Q46 40 45 57"
            fill="#89af7d"
            stroke="#89af7d"
            strokeWidth="4"
          />
          <g fill="#dc9faf">
            <ellipse cx="45" cy="17" rx="10" ry="13" />
            <ellipse cx="30" cy="29" rx="13" ry="10" />
            <ellipse cx="59" cy="29" rx="13" ry="10" />
            <ellipse cx="36" cy="42" rx="10" ry="13" />
            <ellipse cx="54" cy="42" rx="10" ry="13" />
          </g>
          <circle cx="45" cy="30" r="10" fill="#f8d67d" />
        </>
      )}
      {kind === "tree" && <Tree x={44} y={-8} s={0.45} />}
      {kind === "cake" && (
        <>
          <path d="M17 32H74V59Q45 69 17 59Z" fill="#e7afa8" />
          <ellipse cx="45" cy="32" rx="29" ry="11" fill="#fff0d9" />
          <path
            d="M18 34V44Q24 53 28 40Q33 34 38 45Q45 54 49 40Q55 36 59 45Q67 51 73 37"
            fill="#fff0d9"
          />
          <path d="M44 28V13" stroke="#9a8abe" strokeWidth="5" />
          <path d="M44 13Q33 3 44 0Q53 7 44 13" fill="#eac665" />
        </>
      )}
      {kind === "book" && (
        <>
          <path
            d="M12 14Q30 9 45 21Q62 9 80 14V57Q63 49 45 62Q29 50 12 57Z"
            fill="#b1a0d5"
          />
          <path
            d="M18 11Q32 8 45 19Q60 8 74 11V51Q58 48 45 57Q33 48 18 51Z"
            fill="#fff4d7"
          />
          <path d="M45 20V56" stroke="#d4cba9" strokeWidth="2" />
        </>
      )}
      {kind === "star" && (
        <path
          d="M45 4L56 24 80 28 62 45 66 66 45 55 23 66 27 44 10 27 34 24Z"
          fill="#f3d281"
        />
      )}
      {kind === "ball" && (
        <>
          <circle cx="45" cy="36" r="29" fill="#b7a4d7" />
          <path
            d="M20 24Q54 21 66 56M40 8Q23 37 44 64"
            stroke="#fff1c9"
            strokeWidth="10"
            fill="none"
          />
        </>
      )}
    </svg>
  );
}
function Dragon() {
  return (
    <svg viewBox="0 0 160 150" role="img" aria-label="বন্ধু ড্রাগন">
      <ellipse cx="79" cy="139" rx="55" ry="7" fill="#36553e" opacity=".12" />
      <path d="M97 99Q148 127 145 77Q157 124 114 132" fill="#9baccc" />
      <path
        d="M50 79L15 48 13 87 42 106M95 79L117 49 139 91 110 106"
        fill="#b9aad4"
      />
      <ellipse cx="78" cy="101" rx="39" ry="37" fill="#93b6aa" />
      <ellipse cx="78" cy="109" rx="23" ry="24" fill="#d8dfb4" />
      <path d="M47 47L42 17 59 31M91 33L108 19 107 48" fill="#e9d99d" />
      <ellipse cx="76" cy="56" rx="42" ry="36" fill="#a5c9b7" />
      <ellipse cx="77" cy="72" rx="28" ry="16" fill="#c3d6b8" />
      <circle cx="58" cy="54" r="5" fill="#415b54" />
      <circle cx="96" cy="54" r="5" fill="#415b54" />
      <path
        d="M68 77Q78 87 88 77"
        fill="none"
        stroke="#628a76"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="51" cy="134" rx="18" ry="9" fill="#93b6aa" />
      <ellipse cx="103" cy="134" rx="18" ry="9" fill="#93b6aa" />
    </svg>
  );
}
export function World({
  world,
  mood = "idle",
  mini = false,
}: {
  world: WorldState;
  mood?: Mood;
  mini?: boolean;
}) {
  const scene = world.scene;
  const night = scene === "moon";
  const castle = scene === "castle";
  const food = ["restaurant", "shop"].includes(scene);
  const help = scene === "help";
  const palette = {
    purple: "#b6a0d2",
    pink: "#e2acbf",
    blue: "#8ebccc",
    green: "#9ebc98",
    orange: "#dca17e",
  };
  return (
    <div
      className={`world scene-${scene} ${mini ? "mini-world" : ""}`}
      data-scene={scene}
      aria-label={`${labels[scene]} · ${labels[world.role]}`}
    >
      <svg
        className="world-backdrop"
        viewBox="0 0 900 500"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={labels[scene]}
      >
        <defs>
          <linearGradient id={`sky-${scene}-${mini}`} x2="0" y2="1">
            <stop stopColor={night ? "#58587d" : "#e0efe8"} />
            <stop offset="1" stopColor={night ? "#9394bb" : "#f0f5e8"} />
          </linearGradient>
        </defs>
        <rect width="900" height="500" fill={`url(#sky-${scene}-${mini})`} />
        {night ? (
          <>
            <circle cx="728" cy="100" r="47" fill="#f2eace" />
            <circle cx="745" cy="91" r="8" fill="#d6d1b6" />
            {[80, 180, 300, 450, 560, 640, 800].map((x, i) => (
              <path
                key={x}
                d={`M${x} ${60 + (i % 3) * 46}l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z`}
                fill="#f7e5b1"
              />
            ))}
          </>
        ) : (
          <>
            <circle cx="724" cy="87" r="43" fill="#f7e7ae" opacity=".8" />
            <g fill="#fff" opacity=".6">
              <path d="M98 85Q84 63 112 55Q124 25 154 52Q180 49 181 71Q205 86 174 93H106Z" />
              <path d="M560 123Q548 104 570 97Q582 73 606 95Q629 92 630 112Q650 126 623 130H565Z" />
              <path d="M770 165Q758 145 782 139Q797 119 813 140Q845 135 843 155Q868 172 826 174H780Z" />
            </g>
            <g
              fill="none"
              stroke="#87aa9c"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M337 97q9-9 18 0q9-9 18 0M464 54q6-6 12 0q6-6 12 0" />
            </g>
          </>
        )}
        <path
          d="M0 290Q165 204 321 282Q520 174 697 275Q805 227 900 261V500H0Z"
          fill={night ? "#9998b8" : "#c9dfc5"}
        />
        <path
          d="M0 348Q178 279 376 338Q640 249 900 333V500H0Z"
          fill={night ? "#c2bed5" : "#b6d3b0"}
        />
        <path
          d="M0 404Q210 334 443 385Q634 346 900 394V500H0Z"
          fill={night ? "#d9d3df" : "#c8dda9"}
        />
        {world.colored && (
          <rect
            width="900"
            height="500"
            fill={palette[world.color]}
            opacity=".2"
          />
        )}
        {!night && (
          <>
            <Tree x={66} y={153} s={1.3} />
            <Tree x={177} y={236} s={0.7} tone="#a6c3a0" />
            <Tree x={849} y={122} s={1.45} tone="#8db296" />
            <Tree x={760} y={231} s={0.65} tone="#abc699" />
            <path
              d="M335 500Q307 429 417 388Q486 355 468 319Q552 350 489 396Q430 436 548 500Z"
              fill="#ecdfbb"
              opacity=".8"
            />
          </>
        )}
        {castle && (
          <g transform="translate(295 102)">
            <path d="M25 99H300V257H25Z" fill={palette[world.color]} />
            <path d="M104 38H223V247H104Z" fill={palette[world.color]} />
            <path d="M94 45L164-7 234 45Z" fill="#8c78b0" />
            <path d="M13 67H70V256H13ZM253 67H310V256H253Z" fill="#d1c1e2" />
            <path
              d="M2 67L42 4 82 67ZM242 67L282 4 323 67Z"
              fill={palette[world.color]}
            />
            <path d="M131 257V193Q164 142 196 193V257Z" fill="#776c9c" />
            <path d="M164 155V247" stroke="#ddd0e8" strokeWidth="2" />
            {[37, 274].map((x) => (
              <g key={x}>
                <path
                  d={`M${x} 142V119Q${x + 9} 100 ${x + 18} 119V142Z`}
                  fill="#857aab"
                />
              </g>
            ))}
            <path
              d="M165-6V-43L206-31 165-19"
              fill="#ebc77a"
              stroke="#b6a08b"
              strokeWidth="2"
            />
            <path d="M25 164H303" stroke="#ad95c9" strokeWidth="3" />
          </g>
        )}
        {food && (
          <g transform="translate(273 141)">
            <path d="M11 38H345V231H11Z" fill="#fcf0d7" />
            <rect
              x="26"
              y="85"
              width="296"
              height="120"
              rx="5"
              fill="#dfd6bf"
            />
            <path d="M-6 49L28-5H320L359 49Z" fill="#bbceb4" />
            {[0, 2, 4, 6].map((i) => (
              <path
                key={i}
                d={`M${28 + i * 42} -5h42l${i < 3 ? -6 : 6} 54h-51Z`}
                fill="#fbf4df"
              />
            ))}
            {Array.from({ length: 7 }, (_, i) => (
              <path
                key={i}
                d={`M${-6 + i * 52} 49h52v12q-26 25-52 0Z`}
                fill={i % 2 ? "#fbf4df" : "#b4c8ad"}
              />
            ))}
            <rect
              x="89"
              y="-54"
              width="171"
              height="43"
              rx="10"
              fill="#fcf4de"
              stroke="#b9c5a5"
              strokeWidth="3"
            />
            <text
              x="175"
              y="-25"
              textAnchor="middle"
              fill="#6d8266"
              fontSize="20"
              fontFamily="Noto Bengali"
            >
              {scene === "shop" ? "বন্ধুর দোকান" : "মিঠুর রেস্তোরাঁ"}
            </text>
            <rect
              x="-3"
              y="171"
              width="360"
              height="19"
              rx="6"
              fill="#bba17f"
            />
            <path d="M16 190H339V237H16Z" fill="#e6cc9d" />
            <rect x="248" y="91" width="61" height="67" rx="4" fill="#819381" />
            <path
              d="M259 109H296M259 124H290M259 139H293"
              stroke="#dedec9"
              strokeWidth="3"
            />
            <g transform="translate(42 117)">
              <ellipse cx="28" cy="32" rx="26" ry="8" fill="#b7ba9a" />
              <path d="M7 31Q10 8 28 14Q43 5 51 31" fill="#fff8e6" />
            </g>
          </g>
        )}
        {help && (
          <>
            <path
              d="M530 293Q465 355 529 400Q603 451 586 500H732Q749 425 647 387Q566 351 604 293Z"
              fill="#92cbd1"
            />
            <path
              d="M547 324q20 10 39 0M571 402q26 11 49 3M622 460q28 12 57 0"
              fill="none"
              stroke="#d7f1e8"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {world.objects.includes("bridge") && (
              <g>
                <path
                  d="M479 390Q567 330 659 401"
                  fill="none"
                  stroke="#ba9270"
                  strokeWidth="32"
                />
                <path
                  d="M477 369Q564 311 661 381M490 390V352M527 368V333M571 363V325M616 379V344M652 397V368"
                  stroke="#9c795e"
                  strokeWidth="7"
                  fill="none"
                />
              </g>
            )}
            {world.events.includes("safe_path") && (
              <path
                d="M422 459Q390 264 585 271Q688 274 732 396"
                stroke="#f7e8b8"
                strokeWidth="16"
                strokeDasharray="10 12"
                fill="none"
              />
            )}
            <g transform="translate(711 333)">
              <path d="M0 60V-26" stroke="#b5a07b" strokeWidth="6" />
              <path d="M-36-25H39L54-9 39 8H-36Z" fill="#f1dfaf" />
              <text
                x="8"
                y="-3"
                textAnchor="middle"
                fontSize="17"
                fill="#7b865e"
              >
                ফুলবাগান
              </text>
            </g>
          </>
        )}
        {scene === "stage" && (
          <g>
            <path d="M246 336V103H663V336" fill="#9d879f" />
            <path
              d="M235 91H674V126Q557 180 452 125Q328 182 235 126Z"
              fill="#c6a1ac"
            />
            <path
              d="M242 115H324Q330 249 250 327ZM590 115H667V327Q586 257 590 115Z"
              fill="#d4aeba"
            />
            <rect
              x="222"
              y="324"
              width="474"
              height="30"
              rx="6"
              fill="#c5a381"
            />
          </g>
        )}
        {scene === "hospital" && (
          <g>
            <rect
              x="300"
              y="155"
              width="290"
              height="197"
              rx="22"
              fill="#f9eee0"
            />
            <path d="M280 155L446 61 608 155Z" fill="#c1bad3" />
            <rect
              x="412"
              y="99"
              width="68"
              height="63"
              rx="12"
              fill="#ecb1aa"
            />
            <path
              d="M446 109V153M425 130H466"
              stroke="#fff9eb"
              strokeWidth="12"
            />
            <rect
              x="405"
              y="234"
              width="79"
              height="119"
              rx="30"
              fill="#b9cdbf"
            />
          </g>
        )}
        {night && (
          <>
            <ellipse cx="736" cy="402" rx="82" ry="17" fill="#b5aebf" />
            <ellipse cx="186" cy="438" rx="42" ry="9" fill="#bdb7ca" />
            <path
              d="M270 312V212M270 212H328L314 237 270 240"
              stroke="#e4dbc7"
              strokeWidth="5"
              fill="#bcaccf"
            />
          </>
        )}
        {!night && (
          <g>
            {[45, 128, 233, 670, 793, 868].map((x, i) => (
              <g key={x} transform={`translate(${x} ${415 + (i % 3) * 22})`}>
                <path
                  d="M0 20L-5 1M0 20L8 4"
                  stroke="#8eae80"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {i % 2 === 0 && (
                  <>
                    <circle cx="-5" cy="-2" r="5" fill="#eedeb0" />
                    <circle cx="8" cy="2" r="4" fill="#e2adc1" />
                  </>
                )}
              </g>
            ))}
          </g>
        )}
      </svg>
      {!mini && (
        <>
          <div
            className={`hero-pet position-${world.position} ${world.events.includes("pet_helped") && help ? "pet-crossed" : ""}`}
          >
            <Pet mood={mood} />
          </div>
          {world.characters.includes("dragon") && (
            <div className="world-dragon">
              <Dragon />
              {world.events.includes("dragon_hungry") && (
                <span className="character-bubble">
                  {world.objects.includes("mango")
                    ? "আম পেয়েছি!"
                    : "আমার খিদে পেয়েছে!"}
                </span>
              )}
            </div>
          )}
          {world.characters.includes("rabbit") && (
            <svg
              className="world-rabbit"
              viewBox="0 0 90 110"
              aria-label="খরগোশ"
            >
              <ellipse cx="45" cy="83" rx="29" ry="24" fill="#fff3e6" />
              <ellipse cx="30" cy="25" rx="9" ry="25" fill="#fff3e6" />
              <ellipse cx="58" cy="25" rx="9" ry="25" fill="#fff3e6" />
              <circle cx="44" cy="60" r="28" fill="#fff3e6" />
              <circle cx="34" cy="56" r="3" fill="#6d6060" />
              <circle cx="56" cy="56" r="3" fill="#6d6060" />
              <path d="M41 67L47 67 44 71Z" fill="#d69b9d" />
            </svg>
          )}
          {world.characters.includes("bird") && (
            <svg className="world-bird" viewBox="0 0 80 70" aria-label="পাখি">
              <ellipse cx="37" cy="40" rx="24" ry="18" fill="#e5c676" />
              <circle cx="54" cy="26" r="16" fill="#efd58d" />
              <path d="M66 24L79 31 66 35" fill="#cd9c60" />
              <circle cx="57" cy="23" r="3" fill="#665849" />
              <path d="M42 38Q11 4 18 42" fill="#d9b168" />
            </svg>
          )}
          <div className="world-objects">
            {world.objects
              .filter((o) => !(o === "bridge" && help))
              .map((o) => (
                <div className="world-object" key={o} title={labels[o]}>
                  <ObjectArt kind={o} />
                  <span>{labels[o]}</span>
                </div>
              ))}
          </div>
          {world.events.at(-1) === "party" && (
            <div className="confetti" aria-label="উৎসব">
              {Array.from({ length: 18 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    left: `${i * 5.5}%`,
                    animationDelay: `${(i % 5) * 0.2}s`,
                    background: ["#b5a0d8", "#efd181", "#93bca0"][i % 3],
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
      {mini && (
        <div className="mini-pet">
          <Pet mood="happy" />
        </div>
      )}
    </div>
  );
}
