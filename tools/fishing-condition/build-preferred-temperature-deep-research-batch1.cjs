/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const DATA_PATH = "data/fishing-condition/species-environment/research/preferred-temperature-batch1-v1.json";
const REPORT_PATH = "reports/fishing-condition/preferred-temperature-deep-research-batch1-v1.json";
const DOC_PATH = "docs/FISHING_CONDITION_PREFERRED_TEMPERATURE_DEEP_RESEARCH_BATCH1_V1.md";
const IMMUTABLE = {
  v2: ["data/fishing-condition/species-environment/v2/species-environment-profiles.json", "eb365314a15444d7407b7c88b3fd58d95004eaeafe6723efff620b2c7f705f98"],
  v3: ["data/fishing-condition/species-environment/v3/species-environment-profiles.json", "880066b3eefd2100ea870a674504492b8d70da9700a660350fb296ea5bc7a376"],
};
const ACCESS_DATE = "2026-09-13";
const GENERATED_AT = "2026-09-13T12:00:00.000Z";

const species = [
  {
    speciesId: "BM-SPECIES-000755", speciesName: "참돔", scientificName: "Pagrus major",
    currentRange: { min: 18.4, max: 25.4, unit: "degC", context: "juvenile wild-origin laboratory acclimation" },
    promotionDecision: "PROMISING_BUT_LIMITED",
    bestEvidenceId: "pagrus-mitsunaga-1999-wild-adult-telemetry",
    remainingGap: "Adult wild telemetry provides an encountered range, but the study reports little behavioral response to temperature and does not estimate selection or preference.",
    officialSources: [
      { name: "NIFS e-Research Sea species record", url: "https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=11179", result: "Canonical identity and Korean distribution/habitat checked; no preferred-temperature range." },
      { name: "WoRMS taxon record", url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=273976", result: "Accepted taxonomic identity checked; no thermal-preference evidence." },
      { name: "FishBase species summary", url: "https://fishbase.se/summary/SpeciesSummary.php?ID=445", result: "Ecology/reference trail checked; modelled or occurrence context is not strict preference." },
    ],
  },
  {
    speciesId: "BM-SPECIES-000012", speciesName: "조피볼락", scientificName: "Sebastes schlegelii",
    currentRange: { min: 17.8, max: 22.8, unit: "degC", context: "young-fish laboratory preference" },
    promotionDecision: "PROMISING_BUT_LIMITED",
    bestEvidenceId: "sebastes-kim-2026-minipat-observed",
    remainingGap: "Korean field tags recorded adult-sized fish temperatures, but only individual means and variability were reported; no population min/max selection function was estimated.",
    officialSources: [
      { name: "NIFS e-Research Sea species record", url: "https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=11759", result: "Canonical identity checked; no preferred-temperature range." },
      { name: "NIFS black rockfish culture manual", url: "https://www.nifs.go.kr/cmmn/file/farm/farm_02.pdf", result: "Official culture context checked; aquaculture guidance is not wild preference." },
      { name: "WoRMS taxon trail", url: "https://www.marinespecies.org/aphia.php?p=taxlist&tName=Sebastes", result: "Accepted name Sebastes schlegelii checked; no thermal-preference evidence." },
    ],
  },
  {
    speciesId: "BM-SPECIES-000501", speciesName: "방어", scientificName: "Seriola quinqueradiata",
    currentRange: { min: 20.8, max: 27.2, unit: "degC", context: "juvenile wild-origin laboratory acclimation" },
    promotionDecision: "PROMISING_BUT_LIMITED",
    bestEvidenceId: "seriola-hatanaka-1958-selected-coastal-water",
    remainingGap: "A peer-reviewed paper states that schools select 10-20 degC coastal water, but the statement is background context rather than a documented adult selection analysis; modern adult tags report exposure and cold avoidance without a selected min/max range.",
    officialSources: [
      { name: "NIFS e-Research Sea species record", url: "https://www.nifs.go.kr/portal/bt/frctA/actionSpeciesSearchView.do?taxonId=11786", result: "Canonical identity and temperate distribution checked; no numeric preferred range." },
      { name: "WoRMS taxon record", url: "https://www.marinespecies.org/aphia.php?p=taxdetails&id=276651", result: "Accepted taxonomic identity checked; no thermal-preference evidence." },
      { name: "FAO cultured species fact sheet", url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_japaneseamberjack.htm", result: "20-29 degC is explicitly a rearing optimum and is excluded from wild preference." },
    ],
  },
];

function evidence(speciesId, evidenceId, values) {
  const owner = species.find((item) => item.speciesId === speciesId);
  return {
    speciesId,
    speciesName: owner.speciesName,
    scientificName: owner.scientificName,
    evidenceId,
    accessDate: ACCESS_DATE,
    ...values,
    temperature: { min: null, max: null, point: null, unit: "degC", ...values.temperature },
    strictEligible: false,
  };
}

const evidenceRecords = [
  evidence("BM-SPECIES-000755", "pagrus-mitsunaga-1999-wild-adult-telemetry", {
    sourceTitle: "Estimation of the Metabolic Rate of Wild Red Sea Bream Pagrus major in Different Water Temperatures",
    authors: ["Yasushi Mitsunaga", "Wataru Sakamoto", "Nobuaki Arai", "Akihide Kasai"], year: 1999,
    publisherOrJournal: "Nippon Suisan Gakkaishi 65(1):48-54", sourceType: "PEER_REVIEWED_FIELD_TELEMETRY",
    urlOrDoi: "https://www.miyagi.kopas.co.jp/JSFS/jsfs-english/E-PUB/65-1/p048.html",
    geographicContext: "Japan, open sea shoal", lifeStage: "adult", wildCaptiveContext: "wild",
    method: "One wild adult tracked for 28 days with an ultrasonic transmitter; ambient temperature and vertical movement recorded.",
    temperature: { min: 18.5, max: 22.9 }, semanticClass: "WILD_OBSERVED",
    sourceStatementSummary: "The fish encountered 18.5-22.9 degC and stayed near a shoal; temperature fluctuation appeared to have little effect on swimming behavior.",
    rejectionReason: "Encountered temperature is not a selected or preferred range; n=1.", limitations: ["single fish", "observed exposure only", "Japan-only", "no resource-selection model"],
  }),
  evidence("BM-SPECIES-000755", "pagrus-yamamoto-2020-winter-catch", {
    sourceTitle: "Correlation of changes in seasonal distribution and catch of red sea bream Pagrus major with winter temperature in the eastern Seto Inland Sea, Japan (1972-2010)",
    authors: ["Masayuki Yamamoto"], year: 2020, publisherOrJournal: "Fisheries Oceanography 29(1):1-9", sourceType: "PEER_REVIEWED_FISHERIES_TIME_SERIES",
    urlOrDoi: "https://doi.org/10.1111/fog.12432", geographicContext: "Eastern Seto Inland Sea, Japan", lifeStage: "mixed", wildCaptiveContext: "wild fisheries",
    method: "Long-term catch and seasonal distribution correlated with winter temperature at 10 m.", temperature: { point: 8 }, semanticClass: "FIELD_OCCURRENCE",
    sourceStatementSummary: "Winter distribution and catch expanded in warmer years; temperatures below roughly 8 degC were unfavorable.",
    rejectionReason: "Catch correlation and a lower threshold do not define a preferred min/max range.", limitations: ["fishery-dependent", "single threshold", "life stages mixed", "no behavioral selection"],
  }),
  evidence("BM-SPECIES-000755", "pagrus-shin-2004-artificial-reef-telemetry", {
    sourceTitle: "Acoustic Telemetrical Tracking of the Response Behavior of Red Seabream to Artificial Reefs", authors: ["Hyeon-Ok Shin", "Jong-Wan Tae", "Kyoung-Mi Kang"], year: 2004,
    publisherOrJournal: "Korean Journal of Fisheries and Aquatic Sciences 37(5):433-439", sourceType: "PEER_REVIEWED_FIELD_TELEMETRY", urlOrDoi: "https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001115381",
    geographicContext: "Tongyeong marine ranch, Korea", lifeStage: "unknown", wildCaptiveContext: "field release; origin not established in accessible contract",
    method: "Acoustic telemetry of movement and diel behavior around artificial reefs.", semanticClass: "WILD_OBSERVED",
    sourceStatementSummary: "The study reports movement between deep and shallow water and reef response, not thermal selection.", rejectionReason: "No numeric temperature range and no temperature-selection analysis.", limitations: ["temperature absent", "life stage unclear", "origin unclear"],
  }),
  evidence("BM-SPECIES-000755", "pagrus-heo-2021-byeonsan-telemetry", {
    sourceTitle: "Movement range and behavior characteristics of Pagrus major by acoustic telemetry in Byeonsan Peninsular, Korea", authors: ["Gyeom Heo", "Min-A Heo", "Kyoung Mi Kang", "Doo Jin Hwang", "Hyeon Ok Shin"], year: 2021,
    publisherOrJournal: "Journal of the Korean Society of Fisheries and Ocean Technology 57(1):34-44", sourceType: "PEER_REVIEWED_FIELD_TELEMETRY", urlOrDoi: "https://doi.org/10.3796/KSFOT.2021.57.1.034",
    geographicContext: "Byeonsan Peninsula, Korea", lifeStage: "juvenile_or_immature", wildCaptiveContext: "cultured fish released to field", method: "Four cultured fish, mean TL 27.1 cm, tracked around pile-driving work.", semanticClass: "CAPTIVE",
    sourceStatementSummary: "The experiment addresses movement response to construction activity.", rejectionReason: "Cultured fish, short tracking, no preferred-temperature range.", limitations: ["cultured origin", "small sample", "temperature selection absent"],
  }),
  evidence("BM-SPECIES-000755", "pagrus-karama-2021-goto-telemetry", {
    sourceTitle: "Movement pattern of red seabream Pagrus major and yellowtail Seriola quinqueradiata around Offshore Wind Turbine and neighboring habitats", authors: ["Khyria S. Karama", "Yoshiki Matsushita", "Masahiro Inoue", "Kenta Kojima", "Kazuki Tone", "Itsumi Nakamura", "Ryo Kawabe"], year: 2021,
    publisherOrJournal: "Aquaculture and Fisheries 6(3):300-308", sourceType: "PEER_REVIEWED_FIELD_TELEMETRY", urlOrDoi: "https://doi.org/10.1016/j.aaf.2020.04.005", geographicContext: "Goto Islands, Japan", lifeStage: "mixed", wildCaptiveContext: "field-tagged; origin not sufficient for strict transfer",
    method: "Acoustic telemetry around offshore wind turbine and adjacent habitats in winter and summer.", semanticClass: "WILD_OBSERVED", sourceStatementSummary: "Residency and movement around structures were measured.", rejectionReason: "No numeric temperature range or thermal selection analysis.", limitations: ["structure-use focus", "temperature absent", "life-stage applicability unclear"],
  }),
  evidence("BM-SPECIES-000755", "pagrus-kaiseiken-2002-juvenile-preference", {
    sourceTitle: "Experimental study on temperature preference of Japanese marine fish", authors: ["Marine Ecology Research Institute researchers"], year: 2002,
    publisherOrJournal: "Marine Ecology Research Institute report", sourceType: "INSTITUTIONAL_EXPERIMENT_REPORT", urlOrDoi: "https://www.kaiseiken.or.jp/publish/reports/lib/2002_04_02.pdf", geographicContext: "Japan", lifeStage: "juvenile", wildCaptiveContext: "wild-origin, laboratory-acclimated",
    method: "Horizontal temperature-gradient preference experiment across acclimation treatments.", temperature: { min: 18.4, max: 25.4, point: 25.3 }, semanticClass: "LAB_PREFERENCE", sourceStatementSummary: "Explicit acclimation-dependent preference range and final preferendum were reported.", rejectionReason: "Juvenile-only laboratory evidence cannot establish adult general wild preference.", limitations: ["juvenile", "laboratory acclimation", "Japan-only"],
  }),
  evidence("BM-SPECIES-000755", "pagrus-shin-2018-low-temperature-tolerance", {
    sourceTitle: "Survival and Physiological Responses of Red Sea Bream Pagrus major with Decreasing Sea Water Temperature", authors: ["Yun Kyung Shin", "Young Dae Kim", "Won Jin Kim"], year: 2018,
    publisherOrJournal: "Korean Journal of Ichthyology 30(3):131-136", sourceType: "PEER_REVIEWED_CAPTIVE_EXPERIMENT", urlOrDoi: "https://doi.org/10.35399/isk.30.3.1", geographicContext: "Korea", lifeStage: "unknown", wildCaptiveContext: "captive aquaculture experiment", method: "Progressive cooling and seven-day lethal-temperature analysis.", temperature: { point: 6.54 }, semanticClass: "CAPTIVE", sourceStatementSummary: "Seven-day LT50 was 6.54 degC.", rejectionReason: "Lethal tolerance in captivity is not preference.", limitations: ["lethal endpoint", "captive", "no preferred range"],
  }),

  evidence("BM-SPECIES-000012", "sebastes-tsuchida-1997-young-preference", {
    sourceTitle: "Temperature Responses of Young Schlegel's Black Rockfish Sebastes schlegelii", authors: ["Shuji Tsuchida", "Takumi Setoguma"], year: 1997,
    publisherOrJournal: "Nippon Suisan Gakkaishi 63(3):317-325", sourceType: "PEER_REVIEWED_LAB_EXPERIMENT", urlOrDoi: "https://doi.org/10.2331/suisan.63.317", geographicContext: "Japan", lifeStage: "young fish", wildCaptiveContext: "laboratory",
    method: "Horizontal temperature-gradient preference test across 15-28 degC acclimation groups.", temperature: { min: 17.8, max: 22.8, point: 20.5 }, semanticClass: "LAB_PREFERENCE", sourceStatementSummary: "Preferred temperature was 17.8-22.8 degC and final preferendum about 20.5 degC.", rejectionReason: "Young-fish laboratory scope does not establish adult wild preference.", limitations: ["young fish", "laboratory", "Japan-only"],
  }),
  evidence("BM-SPECIES-000012", "sebastes-zhang-2015-acoustic-habitat", {
    sourceTitle: "Short-Term Fidelity, Habitat Use and Vertical Movement Behavior of the Black Rockfish Sebastes schlegelii as Determined by Acoustic Telemetry", authors: ["Yingqiu Zhang", "Qiang Xu", "Josep Alos", "Hui Liu", "Qinzeng Xu", "Hongsheng Yang"], year: 2015,
    publisherOrJournal: "PLOS ONE 10(8):e0134381", sourceType: "PEER_REVIEWED_FIELD_TELEMETRY", urlOrDoi: "https://doi.org/10.1371/journal.pone.0134381", geographicContext: "Haizhou Bay, Yellow Sea, China", lifeStage: "adult_or_general", wildCaptiveContext: "wild-caught and field released",
    method: "Acoustic telemetry and habitat selection index over up to 46 days.", semanticClass: "WILD_SELECTED_HABITAT", sourceStatementSummary: "Selection was demonstrated for reef and substrate classes, not for temperature.", rejectionReason: "The selected variable was substrate; no numeric selected-temperature range was estimated.", limitations: ["short term", "temperature not a selection covariate", "China site"],
  }),
  evidence("BM-SPECIES-000012", "sebastes-kang-shin-2008-homing", {
    sourceTitle: "Home ranges and homing routes of black rockfish Sebastes schlegelii measured by acoustic telemetry", authors: ["Kyoung-Mi Kang", "Hyeon-Ok Shin"], year: 2008,
    publisherOrJournal: "Korean Journal of Fisheries and Aquatic Sciences 41(3):221-227", sourceType: "PEER_REVIEWED_FIELD_TELEMETRY", urlOrDoi: "https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001255238", geographicContext: "Tongyeong marine ranch, Korea", lifeStage: "mixed_or_unknown", wildCaptiveContext: "field release",
    method: "Twenty-four fish released at five distances and tracked acoustically for homing.", semanticClass: "WILD_OBSERVED", sourceStatementSummary: "Homing range and routes were evaluated.", rejectionReason: "No numeric preferred-temperature range or selection analysis.", limitations: ["temperature absent", "life stage unclear", "movement objective"],
  }),
  evidence("BM-SPECIES-000012", "sebastes-kim-2026-minipat-observed", {
    sourceTitle: "Short-Term Movement of MiniPAT-Tagged Coastal Fishes in the Yellow Sea: Case Studies on Korean Rockfish and Spotted Sea Bass", authors: ["Young Uk Kim", "Yun Jeong Seo", "Won Young Lee", "Sung-Yong Oh"], year: 2026,
    publisherOrJournal: "Ocean Science Journal 61(1):11", sourceType: "PEER_REVIEWED_FIELD_TAGGING", urlOrDoi: "https://doi.org/10.1007/s12601-025-00258-2", geographicContext: "Southwestern Korean coast, Yellow Sea", lifeStage: "adult_sized_unknown_maturity", wildCaptiveContext: "field-tagged; capture/origin context not sufficient in accessible abstract",
    method: "Two 33.0-34.1 cm Korean rockfish tracked with external miniPATs for 5-12 days.", temperature: { point: 24.15 }, semanticClass: "WILD_OBSERVED", sourceStatementSummary: "Individuals experienced mean ambient temperatures of 24.15 +/- 1.20 and 17.99 +/- 2.68 degC.", rejectionReason: "Individual means are observed exposure, not a selected population min/max range.", limitations: ["n=2", "5-12 days", "means not bounds", "selection not tested"],
  }),
  evidence("BM-SPECIES-000012", "sebastes-chen-2021-sdm", {
    sourceTitle: "Predicting current and future global distribution of black rockfish Sebastes schlegelii under changing climate", authors: ["Yunlong Chen", "Xiujuan Shan", "Daniel Ovando", "Tao Yang", "Fangqun Dai", "Xianshi Jin"], year: 2021,
    publisherOrJournal: "Ecological Indicators 129:107799", sourceType: "PEER_REVIEWED_SPECIES_DISTRIBUTION_MODEL", urlOrDoi: "https://doi.org/10.1016/j.ecolind.2021.107799", geographicContext: "China, Korea and Japan", lifeStage: "mixed", wildCaptiveContext: "occurrence records and environmental layers",
    method: "Ensemble species-distribution models using bottom temperature and other predictors.", semanticClass: "MODELLED_DISTRIBUTION", sourceStatementSummary: "Bottom temperature was the most important predictor of modelled habitat suitability.", rejectionReason: "Modelled distribution is not observed behavioral preference.", limitations: ["model-derived", "presence-data bias", "no direct selection range"],
  }),
  evidence("BM-SPECIES-000012", "sebastes-hu-2018-thermal-stress", {
    sourceTitle: "Deep Transcriptomic Analysis of Black Rockfish Sebastes schlegelii Provides New Insights on Responses to Acute Temperature Stress", authors: ["Peng Hu", "Jing Liu", "Shanshan Kang", "Jie Chen", "Yunlong Zhang", "et al."], year: 2018,
    publisherOrJournal: "Scientific Reports 8:9113", sourceType: "PEER_REVIEWED_CAPTIVE_EXPERIMENT", urlOrDoi: "https://doi.org/10.1038/s41598-018-27013-z", geographicContext: "Northern Yellow Sea, China", lifeStage: "adult", wildCaptiveContext: "cage-cultured adults, laboratory stress experiment",
    method: "Acute low/control/high temperature challenge with liver transcriptomics.", temperature: { min: 18, max: 24 }, semanticClass: "CAPTIVE", sourceStatementSummary: "The paper cites 18-24 degC as an optimal range while testing acute thermal stress in cultured adults.", rejectionReason: "Secondary aquaculture optimum and captive stress response are not wild selection.", limitations: ["cultured adults", "secondary range", "stress endpoint"],
  }),
  evidence("BM-SPECIES-000012", "sebastes-nakagawa-2007-rearing", {
    sourceTitle: "Effect of Rearing Temperature on Growth and Maturation of Black Rockfish Sebastes schlegelii", authors: ["Masahiro Nakagawa"], year: 2007,
    publisherOrJournal: "Aquaculture Science 55(1):83-89", sourceType: "PEER_REVIEWED_AQUACULTURE_EXPERIMENT", urlOrDoi: "https://doi.org/10.11233/aquaculturesci1953.55.83", geographicContext: "Japan", lifeStage: "juvenile_to_adult", wildCaptiveContext: "captive rearing",
    method: "Fish reared from 7 to 48 months under natural, 12 degC, and 15 degC winter-spring conditions.", temperature: { min: 12, max: 15 }, semanticClass: "AQUACULTURE", sourceStatementSummary: "Growth and maturation responses to managed rearing temperatures were tested.", rejectionReason: "Managed rearing treatments do not establish wild preference.", limitations: ["captive", "treatment temperatures", "growth/maturation endpoint"],
  }),

  evidence("BM-SPECIES-000501", "seriola-furukawa-2020-adult-archival", {
    sourceTitle: "Horizontal and vertical movement of yellowtails Seriola quinqueradiata during summer to early winter recorded by archival tags in the northeastern Japan Sea", authors: ["Shingo Furukawa", "Shingo Ino", "Akira Nitta", "et al."], year: 2020,
    publisherOrJournal: "Marine Ecology Progress Series 636:139-156", sourceType: "PEER_REVIEWED_WILD_ARCHIVAL_TAGGING", urlOrDoi: "https://doi.org/10.3354/meps13226", geographicContext: "Northeastern Japan Sea", lifeStage: "adult", wildCaptiveContext: "wild",
    method: "Twenty-six adults 61-90 cm FL tagged; eight recaptured after more than two months with temperature records every 60 or 120 seconds.", semanticClass: "WILD_OBSERVED", sourceStatementSummary: "Fish primarily occupied the mixed layer, made dives, and avoided cold offshore water during southward movement.", rejectionReason: "Cold avoidance and encountered temperatures were not converted by the study into an explicit selected min/max range.", limitations: ["no explicit preferred bounds", "seasonal scope", "Japan Sea"],
  }),
  evidence("BM-SPECIES-000501", "seriola-ino-2008-adult-migration", {
    sourceTitle: "Migration of the adult yellowtail Seriola quinqueradiata as estimated by archival tagging experiments in the Tsushima Warm Current", authors: ["Shingo Ino", "Akira Nitta", "Nobuhisa Kohno", "Toshihiro Tsuji", "Junichi Okuno", "Toshihiro Yamamoto"], year: 2008,
    publisherOrJournal: "Bulletin of the Japanese Society of Fisheries Oceanography 72(2):92-100", sourceType: "PEER_REVIEWED_WILD_ARCHIVAL_TAGGING", urlOrDoi: "https://doi.org/10.34423/jsfo.72.2_92", geographicContext: "Tsushima Warm Current, Japan Sea and East China Sea", lifeStage: "adult_age_4_plus", wildCaptiveContext: "wild",
    method: "138 tagged; positions estimated for 26 recaptured fish aged four years and older.", semanticClass: "WILD_OBSERVED", sourceStatementSummary: "Three adult migration patterns and likely spawning movements were identified.", rejectionReason: "Accessible full contract does not provide a numeric selected-temperature range.", limitations: ["migration focus", "temperature bounds absent", "selection not quantified"],
  }),
  evidence("BM-SPECIES-000501", "seriola-kim-2024-east-sea-psat", {
    sourceTitle: "Horizontal and vertical movement patterns of yellowtail Seriola quinqueradiata in the East Sea of Korea", authors: ["Korean Institute of Ocean Science and Technology research team"], year: 2024,
    publisherOrJournal: "Fisheries and Aquatic Sciences 27(2):76-86", sourceType: "PEER_REVIEWED_FIELD_TAGGING", urlOrDoi: "https://www.e-fas.org/archive/view_article_pubreader?pid=fas-27-2-76", geographicContext: "South and East Seas of Korea", lifeStage: "adult_sized", wildCaptiveContext: "commercially sourced and sea-cage held before field release",
    method: "Two 8.7 and 9.5 kg fish monitored by PSAT; one record lasted 82 days.", temperature: { point: 16.52 }, semanticClass: "WILD_OBSERVED", sourceStatementSummary: "The long record had mean ambient temperature 16.52 +/- 1.86 degC; a 12-day fish averaged 20.65 +/- 0.36 degC.", rejectionReason: "Observed means from two pre-held fish are not a preferred min/max range.", limitations: ["n=2", "pre-release captivity", "means not bounds", "season-specific"],
  }),
  evidence("BM-SPECIES-000501", "seriola-hatanaka-1958-selected-coastal-water", {
    sourceTitle: "Growth and Food Consumption in Young Amber-Fish, Seriola quinqueradiata", authors: ["Masayoshi Hatanaka", "Goro Murakawa"], year: 1958,
    publisherOrJournal: "Tohoku Journal of Agricultural Research", sourceType: "PEER_REVIEWED_FISHERIES_AND_FEEDING_STUDY", urlOrDoi: "https://tohoku.repo.nii.ac.jp/record/64656/files/KJ00000713873.pdf", geographicContext: "Coastal Japan", lifeStage: "general_statement; study focuses young fish", wildCaptiveContext: "wild fisheries context plus feeding experiments",
    method: "Field samples and feeding experiments; introduction states schools select coastal waters of 10-20 degC.", temperature: { min: 10, max: 20 }, semanticClass: "WILD_SELECTED_HABITAT", sourceStatementSummary: "The paper explicitly states that the species usually migrates in schools selecting 10-20 degC coastal waters.", rejectionReason: "The range is a background assertion without a documented selection analysis or clear adult/general derivation in the paper.", limitations: ["1958 secondary assertion", "supporting reference trail unclear", "study focus young fish", "no selection model"],
  }),
  evidence("BM-SPECIES-000501", "seriola-tian-2012-distribution-model", {
    sourceTitle: "Response of yellowtail, Seriola quinqueradiata, to sea water temperature over the last century and potential effects of global warming", authors: ["Yongjun Tian", "Hideaki Kidokoro", "Takeshi Watanabe", "Yutaka Igeta", "Hiroshi Sakaji", "Shingo Ino"], year: 2012,
    publisherOrJournal: "Journal of Marine Systems 91:1-10", sourceType: "PEER_REVIEWED_DISTRIBUTION_MODEL", urlOrDoi: "https://doi.org/10.1016/j.jmarsys.2011.09.002", geographicContext: "Japan Sea", lifeStage: "mixed", wildCaptiveContext: "fishery records and environmental data",
    method: "Long-term catch/distribution analysis and habitat mapping against sea temperature.", semanticClass: "MODELLED_DISTRIBUTION", sourceStatementSummary: "Yellowtail abundance and distribution were associated with temperature and projected warming.", rejectionReason: "Modelled suitable habitat and catch response are not direct behavioral preference.", limitations: ["modelled", "fishery-dependent", "no direct adult selection range"],
  }),
  evidence("BM-SPECIES-000501", "seriola-karama-2021-goto-telemetry", {
    sourceTitle: "Movement pattern of red seabream Pagrus major and yellowtail Seriola quinqueradiata around Offshore Wind Turbine and neighboring habitats", authors: ["Khyria S. Karama", "Yoshiki Matsushita", "Masahiro Inoue", "Kenta Kojima", "Kazuki Tone", "Itsumi Nakamura", "Ryo Kawabe"], year: 2021,
    publisherOrJournal: "Aquaculture and Fisheries 6(3):300-308", sourceType: "PEER_REVIEWED_FIELD_TELEMETRY", urlOrDoi: "https://doi.org/10.1016/j.aaf.2020.04.005", geographicContext: "Goto Islands, Japan", lifeStage: "unknown_or_mixed", wildCaptiveContext: "field-tagged; origin not sufficient in abstract",
    method: "Twenty yellowtail acoustically tracked around an offshore wind turbine and neighboring reefs/FADs in summer.", semanticClass: "WILD_OBSERVED", sourceStatementSummary: "Residence time and structure use were measured.", rejectionReason: "No numeric temperature range or temperature-selection analysis.", limitations: ["short residency", "temperature absent", "life stage unclear"],
  }),
  evidence("BM-SPECIES-000501", "seriola-kaiseiken-2002-juvenile-preference", {
    sourceTitle: "Experimental study on temperature preference of Japanese marine fish", authors: ["Marine Ecology Research Institute researchers"], year: 2002,
    publisherOrJournal: "Marine Ecology Research Institute report", sourceType: "INSTITUTIONAL_EXPERIMENT_REPORT", urlOrDoi: "https://www.kaiseiken.or.jp/publish/reports/lib/2002_04_02.pdf", geographicContext: "Japan", lifeStage: "juvenile", wildCaptiveContext: "wild-origin, laboratory-acclimated",
    method: "Horizontal temperature-gradient preference experiment across acclimation treatments.", temperature: { min: 20.8, max: 27.2, point: 26.9 }, semanticClass: "LAB_PREFERENCE", sourceStatementSummary: "Explicit acclimation-dependent preference range and final preferendum were reported.", rejectionReason: "Juvenile-only laboratory evidence cannot establish adult general wild preference.", limitations: ["juvenile", "laboratory acclimation", "Japan-only"],
  }),
  evidence("BM-SPECIES-000501", "seriola-fao-aquaculture-optimum", {
    sourceTitle: "Cultured Aquatic Species Information Programme: Seriola quinqueradiata", authors: ["FAO Fisheries and Aquaculture Department"], year: 2009,
    publisherOrJournal: "Food and Agriculture Organization of the United Nations", sourceType: "OFFICIAL_AQUACULTURE_FACT_SHEET", urlOrDoi: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_japaneseamberjack.htm", geographicContext: "Japan and adjacent waters", lifeStage: "culture_cycle", wildCaptiveContext: "aquaculture",
    method: "Culture-practice synthesis.", temperature: { min: 20, max: 29 }, semanticClass: "AQUACULTURE", sourceStatementSummary: "The fact sheet identifies 20-29 degC as optimum rearing temperature.", rejectionReason: "Rearing optimum is not adult wild preference.", limitations: ["aquaculture", "husbandry synthesis", "not behavioral selection"],
  }),
];

const semanticClasses = ["WILD_PREFERRED", "WILD_SELECTED_HABITAT", "WILD_OBSERVED", "FIELD_OCCURRENCE", "MODELLED_DISTRIBUTION", "LAB_PREFERENCE", "CAPTIVE", "AQUACULTURE", "SPAWNING", "JUVENILE_ONLY", "OTHER"];

function sha256File(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, relativePath))).digest("hex");
}

function verifyImmutable() {
  const result = {};
  for (const [key, [relativePath, expected]] of Object.entries(IMMUTABLE)) {
    const actual = sha256File(relativePath);
    if (actual !== expected) throw new Error(`${key} checksum mismatch: ${actual}`);
    result[key] = actual;
  }
  return result;
}

function buildData() {
  return {
    schemaVersion: "1.0.0", generatedAt: GENERATED_AT, dataset: "PREFERRED_WILD_TEMPERATURE_DEEP_RESEARCH_BATCH1_V1",
    purpose: "Research-only evidence candidates; no canonical or runtime promotion.",
    strictCriteria: ["numeric min/max", "confirmed degC", "wild context", "preferred or selected semantics", "adult or general applicability", "non-aquaculture", "non-captive-only", "non-spawning-only", "authoritative reference", "no unresolved preferred conflict"],
    species: species.map(({ officialSources, ...item }) => item),
    evidence: evidenceRecords,
    boundaries: { v2Modified: false, v3Modified: false, runtimeImport: false, canonicalPromotion: false, scoring: false },
  };
}

function buildReport(data) {
  const immutableInputs = verifyImmutable();
  const bySpecies = species.map((item) => {
    const records = evidenceRecords.filter((record) => record.speciesId === item.speciesId);
    return {
      ...item,
      sourcesChecked: [...item.officialSources, ...records.map((record) => ({ name: record.sourceTitle, url: record.urlOrDoi, result: record.sourceStatementSummary }))],
      officialPublicSourceCount: item.officialSources.length,
      peerReviewedCandidateCount: records.filter((record) => record.sourceType.startsWith("PEER_REVIEWED")).length,
      telemetryOrTaggingChecked: records.some((record) => /TELEMETRY|TAGGING/.test(record.sourceType)),
      japaneseLiteratureChecked: records.some((record) => /Japan/.test(record.geographicContext)),
      koreanLiteratureChecked: records.some((record) => /Korea/.test(record.geographicContext)),
      acceptedEvidence: records.map((record) => record.evidenceId),
      rejectedEvidence: records.map((record) => ({ evidenceId: record.evidenceId, reason: record.rejectionReason })),
      strictEligibleEvidence: records.filter((record) => record.strictEligible).map((record) => record.evidenceId),
      evidenceCount: records.length,
    };
  });
  return {
    schemaVersion: "1.0.0", generatedAt: GENERATED_AT, report: "PREFERRED_WILD_TEMPERATURE_DEEP_RESEARCH_BATCH1_V1",
    decision: "NO_STRICT_EXPANSION",
    decisionRationale: "The research found useful adult field and tagging observations, but no species has a numeric adult/general wild min-max range derived from explicit temperature preference or selection analysis. Background assertions, exposure ranges, occurrence correlations, models, juvenile experiments, and aquaculture optima remain non-strict.",
    speciesCount: bySpecies.length,
    sourceHierarchy: ["NIFS and Korean public fisheries institutions", "peer-reviewed field ecology and telemetry", "J-STAGE and institutional reports", "FAO and FishBase primary-reference trails"],
    methodology: { languages: ["Korean", "English", "Japanese"], fullTextPriority: true, duplicateSourcesDeduplicated: true, sourceStatementsParaphrased: true, accessDate: ACCESS_DATE },
    species: bySpecies,
    strict: { before: 1, evidenceFoundCandidates: 0, possibleAfterPromotionReview: 1, possibleCandidateNote: "Seriola quinqueradiata 10-20 degC assertion warrants source-trail review but is not promotion-ready." },
    conflicts: {
      temperature: [],
      existingDepth: [{ speciesId: "BM-SPECIES-000501", speciesName: "방어", status: "CONFLICT_REVIEW_REQUIRED", summary: "MBRIS <=200 m and FishBase <=100 m remain separate; this temperature research does not alter depth." }],
    },
    remainingGaps: bySpecies.map((item) => ({ speciesId: item.speciesId, speciesName: item.speciesName, gap: item.remainingGap })),
    candidateDataset: DATA_PATH,
    immutableInputs,
    boundaries: { v2Modified: false, v3Modified: false, runtimeChanges: false, databaseWrites: false, supabaseChanges: false, canonicalPromotion: false },
    scoringBoundary: { normalization: "NORMALIZATION_NOT_JUSTIFIED", score: false, weight: false, probability: false, ranking: false, recommendation: false },
  };
}

function markdown(report) {
  const sections = report.species.map((item) => {
    const best = evidenceRecords.find((record) => record.evidenceId === item.bestEvidenceId);
    return `## ${item.speciesName} (${item.scientificName})\n\n- Decision: \`${item.promotionDecision}\`\n- Sources checked: ${item.sourcesChecked.length} (${item.officialPublicSourceCount} official/public; ${item.peerReviewedCandidateCount} peer-reviewed candidates)\n- Best evidence: ${best.sourceTitle}\n- Semantic class: \`${best.semanticClass}\`; life stage: \`${best.lifeStage}\`; geography: ${best.geographicContext}\n- Strict eligible: no. ${best.rejectionReason}\n- Remaining gap: ${item.remainingGap}\n`;
  }).join("\n");
  return `# Preferred Wild Temperature Deep Research Batch 1 V1\n\n## Decision\n\n\`NO_STRICT_EXPANSION\`. No reviewed species met every strict criterion. This document is a research record, not a canonical promotion or product scoring input.\n\n## Purpose and method\n\nThe review asked whether adult or generally applicable wild fish select a numeric temperature range. Korean, English, and Japanese official records, peer-reviewed field studies, telemetry/tagging papers, laboratory preference work, models, and aquaculture references were checked. Exposure, occurrence, modelled suitability, spawning, juvenile-only, captive, and culture ranges were kept semantically separate. Duplicate copies of the same paper were treated as one source.\n\n## Source hierarchy\n\n1. NIFS and Korean public fisheries institutions\n2. Peer-reviewed wild field ecology and telemetry\n3. J-STAGE and institutional full-text reports\n4. FAO and FishBase reference trails\n\n${sections}\n## Accepted and rejected evidence\n\nAll ${evidenceRecords.length} evidence records are retained in the research dataset with source metadata and limitations. None is strict-eligible. “Accepted” therefore means retained as research context; every record also carries the exact reason it was rejected for strict promotion.\n\n## Conflicts\n\nNo like-for-like adult wild preferred-temperature conflict was found because no strict range was found. The existing yellowtail depth conflict (MBRIS <=200 m versus FishBase <=100 m) remains untouched and separate from temperature.\n\n## Boundaries\n\n- V2 and V3 are immutable and unchanged.\n- No runtime import, route, comparator, explanation, evidence bundle, alignment, source policy, suitability rule, database, or Supabase change is made.\n- Normalization remains \`NORMALIZATION_NOT_JUSTIFIED\`. No score, weight, probability, ranking, or recommendation is produced.\n\n## Next evidence need\n\nA future promotion requires a source that directly estimates an adult/general wild selected or preferred temperature min/max range. Yellowtail’s 1958 10-20 degC statement should first be traced to its underlying empirical source; it must not be promoted from the background sentence alone.\n`;
}

function write(relativePath, contents) {
  const target = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function main() {
  const data = buildData();
  const report = buildReport(data);
  write(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`);
  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, markdown(report));
  process.stdout.write(`${JSON.stringify({ decision: report.decision, species: report.speciesCount, evidence: evidenceRecords.length })}\n`);
}

if (require.main === module) main();

module.exports = { ACCESS_DATE, DATA_PATH, DOC_PATH, GENERATED_AT, IMMUTABLE, REPORT_PATH, buildData, buildReport, evidenceRecords, semanticClasses, species };
