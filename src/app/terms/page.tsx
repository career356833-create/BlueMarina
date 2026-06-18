import { AppFrame } from "@/components/boat/AppFrame";

const email = "chung356833@gmail.com";
const text = {
  title: "\uC774\uC6A9\uC57D\uAD00",
  intro: "Blue Marina\uB294 \uC870\uC885\uBA74\uD5C8 \uD544\uAE30\uC2DC\uD5D8 \uB300\uBE44 \uD559\uC2B5\uC744 \uBCF4\uC870\uD558\uB294 \uBAA9\uC801\uC73C\uB85C \uC81C\uACF5\uB429\uB2C8\uB2E4.",
  operator: "\uC6B4\uC601: \uC554\uD589\u6F01\uC0AC",
  notice: "\uBB38\uC81C, \uD574\uC124, \uBD84\uC11D \uACB0\uACFC\uB294 \uD559\uC2B5 \uCC38\uACE0\uC6A9\uC774\uBA70 \uC2E4\uC81C \uC2DC\uD5D8 \uACB0\uACFC\uB97C \uBCF4\uC7A5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  rule: "\uC0AC\uC6A9\uC790\uB294 \uC11C\uBE44\uC2A4\uB97C \uBD88\uBC95\uC801\uC778 \uBAA9\uC801\uC774\uB098 \uD0C0\uC778\uC758 \uAD8C\uB9AC\uB97C \uCE68\uD574\uD558\uB294 \uBC29\uC2DD\uC73C\uB85C \uC774\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
  change: "\uC11C\uBE44\uC2A4 \uB0B4\uC6A9\uC740 \uD488\uC9C8 \uAC1C\uC120 \uBC0F \uBC95\uB839 \uBCC0\uACBD\uC5D0 \uB530\uB77C \uC218\uC815\uB420 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  contact: "\uBB38\uC758:"
};

export default function TermsPage() {
  return (
    <AppFrame>
      <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">{text.title}</h1>
        <div className="mt-5 space-y-4 text-sm font-semibold leading-7 text-slate-600">
          <p>{text.intro}</p>
          <p>{text.operator}</p>
          <p>{text.notice}</p>
          <p>{text.rule}</p>
          <p>{text.change}</p>
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
