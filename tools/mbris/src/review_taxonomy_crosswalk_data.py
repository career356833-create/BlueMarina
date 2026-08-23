"""NIFS-MBRIS 학명 충돌 6건의 사람 판정. 공식 근거(WoRMS/NIBR/SeaLifeBase 등)와
함께 사람이 직접 채운다 — 이 파일의 DECISIONS만 orchestrator가 그대로 옮긴다.
"""
from __future__ import annotations

TARGET_KOREAN_NAMES = ["갈치", "명태", "참홍어", "제주소라", "개조개", "오분자기"]

# key: koreanName(NIFS 25종 국명 중 학명 충돌 6건만). 채우기 전에는 비어 있다 —
# 리서치 완료 후 근거와 함께 채운다.
DECISIONS: dict[str, dict] = {

    "갈치": {
        "relationshipType": "taxonomic_revision",
        "sameSpecies": True,
        "confidence": "medium",
        "reviewStatus": "manual_review",
        "evidence": [
            {"source": "WoRMS", "title": "Trichiurus lepturus (AphiaID 127089)",
             "url": "https://www.marinespecies.org/aphia.php?p=taxdetails&id=127089",
             "note": "accepted — 원기재는 아종(T. lepturus japonicus)이었으나 이후 독립종으로 승격"},
            {"source": "WoRMS", "title": "Trichiurus japonicus (AphiaID 305414)",
             "url": "https://www.marinespecies.org/aphia.php?p=taxdetails&id=305414",
             "note": "accepted — WoRMS는 lepturus의 synonym이 아니라 별개의 accepted 종으로 등재"},
            {"source": "FishBase", "title": "Trichiurus japonicus 분포",
             "url": "https://www.fishbase.se/summary/Trichiurus-japonicus.html",
             "note": "분포를 '한국·중국·일본·대만 북서태평양'으로 한정 기재 — 지리적으로 분리된 개체군"},
            {"source": "GBIF", "title": "species/match",
             "url": "https://api.gbif.org/v1/species/match",
             "note": "WoRMS와 상반됨 — GBIF는 T. japonicus를 T. lepturus의 synonym으로 취급"},
        ],
        "reviewNote": (
            "WoRMS(1순위 출처)는 두 학명을 별개의 accepted 종으로 등재하지만 GBIF는 "
            "synonym 관계로 취급해 데이터베이스 간 실제 불일치가 있다. 한국 연근해 "
            "개체군은 지리적 분포상 T. japonicus(북서태평양 고유)에 해당하는 것으로 "
            "보이나, 이것이 'T. lepturus의 학명 개정'인지 '애초에 별개 종'인지는 "
            "생물분류학계 자체에서도 확정되지 않은 상태다. sameSpecies=True로 두되 "
            "confidence는 medium, reviewStatus는 manual_review로 남겨 추가 재검토 여지를 "
            "남긴다 — 이름 유사도만으로 자동 확정하지 않는다."
        ),
    },

    "명태": {
        "relationshipType": "accepted_name_update",
        "sameSpecies": True,
        "confidence": "high",
        "reviewStatus": "approved",
        "evidence": [
            {"source": "WoRMS", "title": "Theragra chalcogramma (AphiaID 254539)",
             "url": "https://www.marinespecies.org/aphia.php?p=taxdetails&id=254539",
             "note": "unaccepted — valid_AphiaID 300735(Gadus chalcogrammus)를 가리킴"},
            {"source": "WoRMS", "title": "Gadus chalcogrammus (AphiaID 300735)",
             "url": "https://www.marinespecies.org/aphia.php?p=taxdetails&id=300735",
             "note": "accepted — Theragra chalcogramma 등을 synonym으로 등재"},
            {"source": "GBIF", "title": "species/match",
             "url": "https://api.gbif.org/v1/species/match",
             "note": "WoRMS와 일치 — Theragra chalcogramma(2415762)를 Gadus chalcogrammus(2415769)의 synonym으로 처리"},
        ],
        "reviewNote": (
            "1999년 이후 분자계통 연구(미토게놈 등)로 명태가 Pacific cod보다 Atlantic "
            "cod(Gadus)에 더 가깝다는 사실이 확인되어 속이 재편입됐다(Theragra 단일종 "
            "속 사실상 폐기, 2014년 미 FDA도 공식 명칭 변경). WoRMS·GBIF 양쪽 모두 "
            "일치하는 명확한 사례라 approved로 확정한다."
        ),
    },

    "참홍어": {
        "relationshipType": "accepted_name_update",
        "sameSpecies": True,
        "confidence": "high",
        "reviewStatus": "approved",
        "evidence": [
            {"source": "WoRMS", "title": "Raja pulchra (AphiaID 271580)",
             "url": "https://www.marinespecies.org/aphia.php?p=taxdetails&id=271580",
             "note": "junior objective synonym — valid_AphiaID 1015739(Beringraja pulchra)를 가리킴"},
            {"source": "WoRMS", "title": "Beringraja pulchra (AphiaID 1015739)",
             "url": "https://www.marinespecies.org/aphia.php?p=taxdetails&id=1015739",
             "note": "accepted, Rajidae"},
            {"source": "WoRMS", "title": "Beringraja (genus, AphiaID 826814)",
             "url": "https://www.marinespecies.org/aphia.php?p=taxdetails&id=826814",
             "note": "Ishihara, Treloar, Bor, Senou & Jeong, 2012 신설 — 알집 산란 전략·clasper 형태 "
                     "+ 분자계통 분석(North Pacific assemblage 단계통) 근거로 Raja에서 분리"},
        ],
        "reviewNote": (
            "종소명(pulchra)과 명명자(Liu, 1932)는 동일하고 속명만 이관(genus transfer)됐다 "
            "— 전형적인 학명 개정. Raja binoculata 등 다른 북태평양 홍어류도 함께 "
            "Beringraja로 이관되어 계통학적 근거가 명확하다."
        ),
    },

    "제주소라": {
        "relationshipType": "taxonomic_revision",
        "sameSpecies": True,
        "confidence": "high",
        "reviewStatus": "approved",
        "evidence": [
            {"source": "WoRMS/MolluscaBase", "title": "Turbo sazae (AphiaID 994353)",
             "url": "https://www.marinespecies.org/aphia.php?p=taxdetails&id=994353",
             "note": "accepted — H. Fukuda, 2017"},
            {"source": "WoRMS/MolluscaBase", "title": "Turbo cornutus (AphiaID 413379)",
             "url": "https://www.marinespecies.org/aphia.php?p=taxdetails&id=413379",
             "note": "accepted이지만 별개 유효종 — 중국 남부·대만 고유종으로 분포 한정"},
            {"source": "WoRMS/MolluscaBase", "title": "Batillus cornutus (AphiaID 1600422)",
             "url": "https://www.marinespecies.org/aphia.php?p=taxdetails&id=1600422",
             "note": "superseded combination — valid_name은 Turbo cornutus(별도 종이 아니라 "
                     "Batillus아속의 구식 속명 승격 표기)"},
            {"source": "Molluscan Research", "title": "Fukuda H. (2017) 37(4):268-281",
             "url": "",
             "note": "일본·한국 개체군에 적용되던 'Turbo cornutus'가 실제로는 오적용명(misapplied "
                     "name)이며 진짜 T. cornutus는 중국·대만 고유종임을 밝히고 T. sazae를 신학명으로 부여"},
        ],
        "reviewNote": (
            "단순 synonym 치환이 아니라 '오적용명 교정'이다 — 한국산 소라가 수십 년간 "
            "잘못된 학명(중국·대만 고유종의 이름)으로 불려왔고, 2017년 논문으로 한국·"
            "일본 개체군 전용 학명(T. sazae)이 확정됐다. NIFS의 'Batillus cornutus' "
            "병기는 'Turbo (Batillus) cornutus'라는 구식 아속 표기를 콤마로 분해한 것으로 "
            "판단되며 별도 분류군이 아니다. '제주소라'가 '소라'와 별도 국명으로 등재된 "
            "공식 근거는 확인되지 않았다 — 산지 표시 유통명으로 보이며, 이는 학명 "
            "판정과 분리해 별도 aggregate/시장명 검토가 필요할 수 있다."
        ),
    },

    "개조개": {
        "relationshipType": "gender_ending_variant",
        "sameSpecies": True,
        "confidence": "high",
        "reviewStatus": "approved",
        "evidence": [
            {"source": "WoRMS/MolluscaBase", "title": "Saxidomus purpurata (AphiaID 582808)",
             "url": "https://www.molluscabase.org/aphia.php?p=taxdetails&id=582808",
             "note": "accepted"},
            {"source": "WoRMS/MolluscaBase", "title": "Saxidomus purpuratus [sic] (AphiaID 367780)",
             "url": "https://www.molluscabase.org/aphia.php?p=taxdetails&id=367780",
             "note": "unaccepted — unacceptreason='incorrect gender ending; Saxidomus is feminine', "
                     "valid_AphiaID=582808(purpurata)를 가리킴"},
        ],
        "reviewNote": (
            "WoRMS/MolluscaBase가 명시적으로 'Saxidomus는 여성형 속명이라 어미가 틀렸다'고 "
            "기록한, 가장 명확한 문법적 어미 변형 사례다. 동일 종 확정."
        ),
    },

    "오분자기": {
        "relationshipType": "unresolved_conflict",
        "sameSpecies": False,
        "confidence": "low",
        "reviewStatus": "unresolved",
        "evidence": [
            {"source": "WoRMS/MolluscaBase", "title": "Haliotis diversicolor (AphiaID 445319)",
             "url": "https://www.molluscabase.org/aphia.php?p=taxdetails&id=445319",
             "note": "accepted, 별개의 유효종. synonym은 'Sulculus diversicolor'/'Haliotis (Sulculus) "
                     "diversicolor'뿐 — supertexta는 이 종의 이명이 아니다"},
            {"source": "WoRMS/MolluscaBase", "title": "Haliotis supertexta (AphiaID 445364)",
             "url": "https://www.molluscabase.org/aphia.php?p=taxdetails&id=445364",
             "note": "accepted, diversicolor와 별개. Owen(2004) 'Of Sea and Shore' 26(2):99-105이 "
                     "과거 아종(H. diversicolor supertexta)이던 것을 독립종으로 승격시킨 근거 문헌"},
            {"source": "국립생물자원관(NIBR)", "title": "국가생물종목록 무척추동물-V(연체동물-I 복족류) PDF",
             "url": "https://www.nibr.go.kr/aiibook/catImage/30/Invertebrates-V.pdf",
             "note": "국내 공식 목록: 'Sulculus diversicolor diversicolor(마대오분자기)'와 "
                     "'Sulculus diversicolor supertexta(오분자기)'를 서로 다른 국명의 별개 아종으로 등재"},
            {"source": "GBIF", "title": "species/match?name=Haliotis supertexta",
             "url": "https://api.gbif.org/v1/species/match?name=Haliotis%20supertexta",
             "note": "ACCEPTED, synonym=null — WoRMS와 일치, diversicolor의 이명 아님"},
        ],
        "reviewNote": (
            "가장 엄격하게 검토가 필요한 케이스. NIBR 국가목록은 '마대오분자기'(기준아종 "
            "diversicolor)와 '오분자기'(아종 supertexta)를 Sulculus diversicolor라는 같은 "
            "종 아래 서로 다른 국명의 아종으로 취급하지만, NIFS 원본 레코드의 학명은 "
            "'Sulculus diversicolor'로만 적혀 있어 아종명(supertexta)이 생략된 것인지, "
            "아니면 실제로 기준아종(마대오분자기)을 가리키는 것인지 원문(JS 렌더링으로 "
            "직접 확인 실패)만으로는 판단할 수 없다. 한편 MBRIS/WoRMS는 supertexta를 "
            "diversicolor와 완전히 별개인 독립종(Haliotis supertexta)으로 승격시켜 다루므로, "
            "'같은 종'이라고 자동으로 병합하면 실제로는 마대오분자기(diversicolor)와 "
            "오분자기(supertexta)라는 서로 다른 두 생물을 하나로 잘못 연결할 위험이 있다. "
            "제한사항('오분자기 자동 연결 금지', '공식 근거 없는 동일종 판정 금지')에 따라 "
            "sameSpecies=False, unresolved_conflict로 남기고 NIFS 원본 담당자에게 원래 "
            "의도한 아종이 무엇인지 재확인을 요청해야 한다."
        ),
    },
}
