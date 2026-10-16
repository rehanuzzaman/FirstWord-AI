import { useId } from "react";
export type Mood =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "curious"
  | "confused"
  | "worried"
  | "celebrating"
  | "comforting";
export function Pet({
  mood = "idle",
  className = "",
}: {
  mood?: Mood;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={`pet pet-${mood} ${className}`}
      viewBox="0 0 260 300"
      role="img"
      aria-label={`মিঠু · ${mood}`}
    >
      <defs>
        <linearGradient id={`${id}fur`} x2=".6" y2="1">
          <stop stopColor="#ffd9a9" />
          <stop offset="1" stopColor="#f4aa70" />
        </linearGradient>
        <linearGradient id={`${id}belly`} x2="0" y2="1">
          <stop stopColor="#fff6df" />
          <stop offset="1" stopColor="#ffe7c5" />
        </linearGradient>
      </defs>
      <ellipse cx="134" cy="281" rx="78" ry="12" fill="#37563d" opacity=".12" />
      <g className="pet-body">
        <path
          className="pet-tail"
          d="M181 241C242 264 258 201 234 192C215 185 218 224 185 213"
          fill={`url(#${id}fur)`}
          stroke="#ed9e65"
          strokeWidth="2"
        />
        <ellipse cx="129" cy="219" rx="65" ry="63" fill={`url(#${id}fur)`} />
        <ellipse cx="130" cy="232" rx="42" ry="42" fill={`url(#${id}belly)`} />
        <ellipse cx="87" cy="271" rx="31" ry="16" fill="#f7bd87" />
        <ellipse cx="168" cy="271" rx="31" ry="16" fill="#f7bd87" />
        <path
          className="pet-arm left"
          d="M73 199Q36 196 39 220Q44 237 72 224"
          fill="#f7ba82"
        />
        <path
          className="pet-arm right"
          d="M184 199Q219 187 224 207Q222 229 189 226"
          fill="#f7ba82"
        />
        <g className="pet-head">
          <path
            d="M53 95Q20 13 50 23Q79 28 102 54L162 54Q189 22 217 22Q238 26 208 99"
            fill={`url(#${id}fur)`}
            stroke="#efb37e"
            strokeWidth="2"
          />
          <path
            d="M51 76L47 37Q70 42 85 67Z M179 67Q195 42 213 36L208 80Z"
            fill="#ec9c94"
          />
          <path
            d="M44 83Q61 48 127 48Q193 46 215 85Q239 124 210 166Q190 190 130 191Q69 194 43 164Q20 133 44 83"
            fill={`url(#${id}fur)`}
          />
          <path d="M126 50L122 67 135 76 144 54" fill="#ecad77" />
          <path
            d="M71 131Q103 111 129 135Q156 112 187 135Q204 171 170 180Q129 196 88 180Q52 166 71 131"
            fill="#fff1d7"
          />
          <ellipse
            cx="62"
            cy="137"
            rx="18"
            ry="10"
            fill="#ef9b8c"
            opacity=".6"
          />
          <ellipse
            cx="198"
            cy="137"
            rx="18"
            ry="10"
            fill="#ef9b8c"
            opacity=".6"
          />
          {["happy", "celebrating", "comforting"].includes(mood) ? (
            <g
              fill="none"
              stroke="#513d3b"
              strokeWidth="6"
              strokeLinecap="round"
            >
              <path d="M75 119Q84 104 94 119" />
              <path d="M162 119Q173 103 183 119" />
            </g>
          ) : (
            <g className="pet-eyes">
              <ellipse
                cx="84"
                cy="118"
                rx="9"
                ry={mood === "curious" ? 13 : 12}
                fill="#513d3b"
              />
              <ellipse
                cx="174"
                cy="118"
                rx="9"
                ry={mood === "confused" ? 8 : 12}
                fill="#513d3b"
              />
              <circle cx="87" cy="114" r="3" fill="white" />
              <circle cx="177" cy="114" r="3" fill="white" />
            </g>
          )}
          <path
            d="M122 137Q130 132 138 137Q134 145 130 145Q126 145 122 137"
            fill="#b57262"
          />
          {mood === "speaking" ? (
            <ellipse
              className="pet-mouth"
              cx="130"
              cy="157"
              rx="12"
              ry="10"
              fill="#875454"
            />
          ) : mood === "worried" || mood === "confused" ? (
            <path
              d="M122 160Q130 154 139 160"
              stroke="#86534e"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M116 151Q119 160 130 156Q141 162 145 151"
              stroke="#86534e"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          )}
          <g stroke="#ca9773" strokeWidth="2" strokeLinecap="round">
            <path d="M49 144L28 140M50 153L30 156M209 144L230 140M207 153L230 156" />
          </g>
        </g>
        <path
          d="M85 182Q130 204 180 181L174 205Q125 219 90 204Z"
          fill="#9180c8"
        />
        <path d="M157 201L170 235 193 222 177 197" fill="#a393d5" />
        <circle cx="130" cy="204" r="9" fill="#f6d981" />
        <path d="M130 199V207M126 203H134" stroke="#b48d43" strokeWidth="2" />
      </g>
      {mood === "listening" && (
        <g
          fill="none"
          stroke="#9b83ca"
          strokeWidth="4"
          strokeLinecap="round"
          className="listen-lines"
        >
          <path d="M21 72Q9 94 16 108M8 61Q-7 90 1 114M236 70Q249 89 243 109" />
        </g>
      )}
      {mood === "thinking" && (
        <g fill="#9c8bcc" className="thinking-dots">
          <circle cx="212" cy="40" r="4" />
          <circle cx="230" cy="25" r="6" />
          <circle cx="244" cy="8" r="8" />
        </g>
      )}
      {mood === "celebrating" && (
        <g fill="#e8bd56">
          <path d="M21 34l4 10 11 3-11 4-4 11-4-11-10-4 10-3ZM233 126l4 10 11 3-11 4-4 11-4-11-10-4 10-3Z" />
        </g>
      )}
    </svg>
  );
}
