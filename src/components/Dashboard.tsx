import { useState } from "react";
import { summarizeMetrics } from "../../shared/progress";
import {
  ArrowLeft,
  ShieldCheck,
  MessageCircle,
  Sprout,
  BookOpen,
  Trash2,
  Mic,
  ArrowUpRight,
  Check,
  Download,
  Volume2,
} from "lucide-react";
import {
  labels,
  recommendation,
  type Profile,
  type Scene,
} from "../../shared/engine";
export function Dashboard({
  profile,
  demo,
  busy,
  onBack,
  onUpdate,
  onDelete,
  onStart,
}: {
  profile: Profile;
  demo: boolean;
  busy: boolean;
  onBack: () => void;
  onUpdate: (data: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
  onStart: (scene: Scene) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const rec = recommendation(profile);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      label: d.toLocaleDateString("en", { weekday: "short" }),
      count: profile.history.filter(
        (t) => new Date(t.time).toDateString() === d.toDateString(),
      ).length,
    };
  });
  const max = Math.max(...days.map((d) => d.count), 1);
  const words = Object.entries(profile.words);
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(profile, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "firstword-local-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="dashboard page-enter">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={17} /> খেলায় ফিরে যাই
      </button>
      <div className="section-heading">
        <div>
          <div className="eyebrow">A LITTLE GROWTH, EVERY DAY</div>
          <h1>অভিভাবকের আঙিনা</h1>
          <p>ছোট ছোট কথা, নতুন নতুন আবিষ্কার।</p>
        </div>
        <span className="privacy-pill">
          <ShieldCheck size={16} />
          {demo
            ? "Demo data · separate profile"
            : profile.consent
              ? "Saved on this server"
              : "Temporary session · not saved to disk"}
        </span>
      </div>
      {demo && (
        <div className="notice lavender">
          এটি ডেমো প্রোফাইল। নিচের তথ্য এই ডেমোতে করা আসল টেক্সট ইন্টারঅ্যাকশন
          থেকে এসেছে, কোনো শিশুর কৃত্রিম স্কোর নয়।
        </div>
      )}
      <div className="stats-grid">
        {[
          {
            icon: MessageCircle,
            value: profile.history.length,
            title: "কথার আদানপ্রদান",
            caption: "Recorded turns",
          },
          {
            icon: Sprout,
            value: profile.completed.length,
            title: "শেষ করা কার্যক্রম",
            caption: "Transitions & completed tasks",
          },
          {
            icon: BookOpen,
            value: words.length,
            title: "ব্যবহার করা শব্দ",
            caption: "Distinct supported words",
          },
        ].map(({ icon: Icon, ...s }) => (
          <div className="stat-card" key={s.title}>
            <span className="stat-icon">
              <Icon size={22} />
            </span>
            <strong>{s.value}</strong>
            <h3>{s.title}</h3>
            <small>{s.caption}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-title">
            <h2>এই সপ্তাহের কথাগুলো</h2>
            <span>গত ৭ দিন</span>
          </div>
          <div className="bar-chart">
            {days.map((d, i) => (
              <div className="bar-column" key={i}>
                <b>{d.count}</b>
                <div className="bar-track">
                  <div style={{ height: `${(d.count / max) * 100}%` }} />
                </div>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
          <p className="muted small">
            কথার পালার সংখ্যা—দক্ষতার স্কোর বা ক্লিনিক্যাল মূল্যায়ন নয়।
          </p>
        </section>
        <section className="panel recommendation">
          <span className="tiny-label">
            <Sprout size={15} /> পরের ছোট্ট পদক্ষেপ
          </span>
          <h2>{labels[rec.scene]}</h2>
          <p>{rec.reason}</p>
          <blockquote>{rec.prompt}</blockquote>
          <button className="primary-button" onClick={() => onStart(rec.scene)}>
            একসঙ্গে খেলি <ArrowUpRight size={17} />
          </button>
          <small>স্বচ্ছ নিয়মভিত্তিক পরামর্শ · {rec.kind}</small>
        </section>
        <section className="panel">
          <h2>যে শব্দগুলো এসেছে</h2>
          <div className="word-chips">
            {words.length ? (
              words.map(([word, count]) => (
                <span key={word}>
                  {labels[word]} <small>× {count}</small>
                </span>
              ))
            ) : (
              <p className="empty-copy">
                খেলার সময় নতুন শব্দগুলো এখানে জমা হবে।
              </p>
            )}
          </div>
          <h3 className="spaced-heading">কথা বলার সুযোগগুলো</h3>
          <div className="skill-list">
            {Object.entries(profile.skills).length ? (
              Object.entries(profile.skills).map(([skill, count]) => (
                <div key={skill}>
                  <span>
                    <Check size={15} />
                    {labels[skill] || skill}
                  </span>
                  <b>{count} বার</b>
                </div>
              ))
            ) : (
              <p className="empty-copy">এখনও কোনো পর্যবেক্ষণ নেই।</p>
            )}
          </div>
          <p className="small muted">
            শব্দ, বাক্যের দৈর্ঘ্য ও গল্পের কাজ থেকে পর্যবেক্ষণ। ব্যাকরণ বা
            উচ্চারণের নির্ভুলতা মাপা হয় না।
          </p>
        </section>
        <section className="panel">
          <h2>প্রোফাইল ও গোপনীয়তা</h2>
          <label className="field-label" htmlFor="nickname">
            ডাকনাম (আসল নাম প্রয়োজন নেই)
          </label>
          <form
            className="nickname-form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await onUpdate({ name });
                setSaved(true);
              } catch {
                /* surfaced by parent */
              }
            }}
          >
            <input
              id="nickname"
              value={name}
              maxLength={24}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              disabled={demo}
            />
            <button disabled={demo || busy || !name.trim()}>
              {saved ? "সংরক্ষিত" : "সেভ"}
            </button>
          </form>
          <label className="toggle-row">
            <span>
              <ShieldCheck size={19} />
              <span>
                স্থানীয় সংরক্ষণের অনুমতি
                <small>এই সার্ভারে কথার লেখা ও অগ্রগতি রাখা হবে</small>
              </span>
            </span>
            <input
              aria-label="Storage consent"
              type="checkbox"
              checked={profile.consent}
              disabled={demo || busy}
              onChange={(e) =>
                onUpdate({ consent: e.target.checked }).catch(() => {})
              }
            />
          </label>
          <label className="toggle-row">
            <span>
              <Mic size={19} />
              <span>
                মাইক্রোফোনের অনুমতি
                <small>বন্ধ করলে চলমান রেকর্ডিং সঙ্গে সঙ্গে থামবে</small>
              </span>
            </span>
            <input
              aria-label="Microphone permission"
              type="checkbox"
              checked={profile.microphone}
              disabled={demo || busy || !profile.consent}
              onChange={(e) =>
                onUpdate({ microphone: e.target.checked }).catch(() => {})
              }
            />
          </label>
          <div className="privacy-note">
            <Volume2 size={17} />
            <p>
              অডিও শুধু ট্রান্সক্রিপশনের জন্য মেমোরিতে থাকে। অডিও ফাইল সংরক্ষণ
              করা হয় না। এই প্রিভিউতে অডিও প্রিভিউ সার্ভারে যায়; নিজের
              কম্পিউটারে চালালে সেখানেই থাকে।
            </p>
          </div>
          <button className="text-button" onClick={exportData}>
            <Download size={16} /> প্রোফাইল ডাউনলোড
          </button>
          <button
            className="text-button danger"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={16} />{" "}
            {demo ? "ডেমো তথ্য মুছুন" : "সমস্ত স্থানীয় তথ্য মুছুন"}
          </button>
        </section>
      </div>
      <section className="panel progress-panel" aria-label="কথার সংখ্যা">
        <div className="panel-title">
          <h2>কথার সংখ্যা</h2>
          <span>শুধু গণনা করা তথ্য</span>
        </div>
        {(() => {
          const rows = profile.history
            .map((t) => t.metrics)
            .filter((m): m is NonNullable<typeof m> => Boolean(m));
          const summary = summarizeMetrics(rows);
          if (!summary)
            return (
              <p className="empty-copy">
                শিশু কথা বললে প্রতিটি কথার শব্দ-সংখ্যা, নতুন শব্দ, বাক্যের দৈর্ঘ্য
                আর উত্তরের সময় এখানে জমা হবে।
              </p>
            );
          return (
            <dl className="progress-grid">
              <div><dt>কথা</dt><dd>{summary.turns}</dd></div>
              <div><dt>গড় শব্দ / কথা</dt><dd>{summary.avgWords}</dd></div>
              <div><dt>গড় নতুন শব্দ / কথা</dt><dd>{summary.avgNewWords}</dd></div>
              <div><dt>গড় বাক্য-দৈর্ঘ্য (শব্দ)</dt><dd>{summary.avgSentenceWords}</dd></div>
              <div><dt>গড় উত্তরের সময়</dt><dd>{summary.avgResponseMs} ms</dd></div>
            </dl>
          );
        })()}
        <p className="technical-note">
          এগুলো শুধু গোনা। এখানে কোনো রোগ-নির্ণয়, বয়স বা উচ্চারণের স্কোর নেই।
        </p>
      </section>
      <section className="panel history-panel">
        <div className="panel-title">
          <h2>কথার খাতা</h2>
          <span>সাম্প্রতিক {Math.min(profile.history.length, 20)} পালা</span>
        </div>
        {!profile.history.length ? (
          <p className="empty-copy">
            একটা গল্প শুরু হলে, তার কথাগুলো এখানে দেখা যাবে।
          </p>
        ) : (
          <div className="history-table">
            {profile.history
              .slice(-20)
              .reverse()
              .map((t) => (
                <div className="history-row" key={t.id}>
                  <span className="history-time">
                    {new Date(t.time).toLocaleTimeString("en", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <small>
                      {t.source === "demo"
                        ? "Demo text"
                        : t.source === "voice"
                          ? "Whisper audio"
                          : "Text input"}
                    </small>
                  </span>
                  <div>
                    <strong>{t.child}</strong>
                    <p>{t.pet}</p>
                  </div>
                  <span className="tag">{labels[t.scene]}</span>
                </div>
              ))}
          </div>
        )}
      </section>
      <footer className="clinical-note">
        <ShieldCheck size={18} />
        <p>
          FirstWord AI দৈনন্দিন যোগাযোগের অনুশীলনে সাহায্য করে। এটি স্পিচ
          থেরাপি, রোগনির্ণয় বা যোগ্য স্পিচ ও ভাষা বিশেষজ্ঞের বিকল্প নয়। এটি
          স্থানীয় প্রতিযোগিতার MVP, উৎপাদন-প্রস্তুত শিশু সুরক্ষা ব্যবস্থা নয়।
        </p>
      </footer>
      {confirm && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Delete profile"
          >
            <span className="modal-icon danger">
              <Trash2 />
            </span>
            <h2>সব তথ্য মুছে ফেলবেন?</h2>
            <p>
              কথার ইতিহাস, শব্দ, অনুমতি ও খেলার অগ্রগতি মুছে যাবে। এটি আর ফেরানো
              যাবে না।
            </p>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => setConfirm(false)}
              >
                ফিরে যাই
              </button>
              <button
                className="danger-button"
                disabled={busy}
                onClick={async () => {
                  await onDelete();
                  setConfirm(false);
                  setName("ছোট্ট বন্ধু");
                }}
              >
                হ্যাঁ, মুছুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
