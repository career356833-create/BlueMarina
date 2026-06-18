import { AppFrame } from "@/components/boat/AppFrame";

const email = "chung356833@gmail.com";
const text = {
  title: "\uAC1C\uC778\uC815\uBCF4\uCC98\uB9AC\uBC29\uCE68",
  intro: "Blue Marina(\uBE14\uB8E8\uB9C8\uB9AC\uB098)\uB294 \uC218\uC0C1\uB3D9\uB825\uAE30\uAD6C \uC870\uC885\uBA74\uD5C8 \uD559\uC2B5\uC744 \uB3D5\uAE30 \uC704\uD55C \uC11C\uBE44\uC2A4\uC785\uB2C8\uB2E4.",
  operator: "\uC6B4\uC601: \uC554\uD589\u6F01\uC0AC",
  storage: "\uD604\uC7AC MVP\uB294 \uD68C\uC6D0\uAC00\uC785 \uC5C6\uC774 \uBE0C\uB77C\uC6B0\uC800 localStorage\uC5D0 \uD559\uC2B5 \uAE30\uB85D, \uC624\uB2F5 \uAE30\uB85D, \uBAA8\uC758\uACE0\uC0AC \uAE30\uB85D\uC744 \uC800\uC7A5\uD569\uB2C8\uB2E4.",
  local: "\uC800\uC7A5\uB41C \uB370\uC774\uD130\uB294 \uC0AC\uC6A9\uC790\uC758 \uAE30\uAE30\uC640 \uBE0C\uB77C\uC6B0\uC800\uC5D0 \uBCF4\uAD00\uB418\uBA70, \uC11C\uBC84\uB85C \uC804\uC1A1\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  future: "\uD5A5\uD6C4 \uACC4\uC815 \uAE30\uB2A5 \uB610\uB294 \uAD11\uACE0 \uC11C\uBE44\uC2A4\uAC00 \uCD94\uAC00\uB420 \uACBD\uC6B0 \uC218\uC9D1 \uD56D\uBAA9\uACFC \uC774\uC6A9 \uBAA9\uC801\uC744 \uBCF8 \uBC29\uCE68\uC5D0 \uBC18\uC601\uD569\uB2C8\uB2E4.",
  contact: "\uBB38\uC758:"
};

export default function PrivacyPage() {
  return (
    <AppFrame>
      <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">{text.title}</h1>
        <div className="mt-5 space-y-4 text-sm font-semibold leading-7 text-slate-600">
          <p>{text.intro}</p>
          <p>{text.operator}</p>
          <p>{text.storage}</p>
          <p>{text.local}</p>
          <p>{text.future}</p>
          <p>
            {text.contact}{" "}
            <a className="font-black text-sky-700" href={`mailto:${email}`}>
              {email}
            </a>
          </p>
        </div>
      </section>
    </AppFrame>
  );
}
