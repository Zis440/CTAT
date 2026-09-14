"""
Standalone Precompute TAT Prototypes (Zero-dependency on engines)
-----------------------------------------------------------------
Generates backend/data/tat_prototypes.npz using quantized ONNX in seconds.
"""

import os
os.environ["USE_TF"] = "0"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import sys
from pathlib import Path
import numpy as np

BACKEND_ROOT = Path(__file__).resolve().parent.parent

NEED_PROTOTYPES = {
    "nAchievement": [
        "The person strives to accomplish something difficult.",
        "They want to overcome obstacles and succeed.",
        "Aiming to excel and reach a high standard.",
        "Desire to master a skill or task.",
        "The person works hard to bring honor to their family through success.",
        "They study diligently to fulfill their parents' expectations.",
    ],
    "nAffiliation": [
        "The individual seeks to be with others, to form friendships.",
        "They want to belong to a group or community.",
        "Desire to share and cooperate with companions.",
        "Need to feel accepted and liked.",
        "The person feels complete being surrounded by their family.",
        "They find meaning through community and shared rituals.",
        "Duty toward the family brings them inner peace.",
    ],
    "nAutonomy": [
        "The person wants to be independent, free from constraints.",
        "They resist influence or coercion from others.",
        "Desire to act according to own wishes.",
        "Need to be self-sufficient and not rely on others.",
        "They want to make their own career choice despite family expectations.",
        "The person seeks to balance personal goals with family obligations.",
    ],
    "nDominance": [
        "The individual wants to control their environment or other people.",
        "They seek to influence or direct others.",
        "Desire to be a leader or have authority.",
        "Need to be in charge and make decisions."
    ],
    "nNurturance": [
        "The person wants to help, protect, or care for others.",
        "They provide support and comfort.",
        "Desire to be compassionate and nurturing.",
        "Need to take care of someone vulnerable.",
        "They feel it is their duty to care for aging parents.",
        "The person sacrifices their own needs for the family's wellbeing.",
    ],
    "nSuccorance": [
        "The individual seeks help, protection, or sympathy from others.",
        "They want to be taken care of.",
        "Desire for support when in trouble.",
        "Need to depend on someone.",
        "The person turns to their family elders for guidance and comfort.",
        "They seek the community's support during difficult times.",
    ],
    "nRecognition": [
        "The person wants to be admired, respected, or praised.",
        "They seek social approval and fame.",
        "Desire for honor and recognition.",
        "Need to be noticed and valued."
    ],
    "nUnderstanding": [
        "The individual wants to understand, to know, to figure things out.",
        "They seek knowledge and insight.",
        "Desire to comprehend complex ideas.",
        "Need to make sense of the world."
    ],
    "nHarmAvoidance": [
        "The person wants to avoid pain, physical danger, or illness.",
        "They are cautious and fearful of harm.",
        "Desire to stay safe and secure.",
        "Need to prevent injury or threat.",
        "The person avoids actions that might bring shame upon the family.",
    ],
    "nAbasement": [
        "The individual wants to submit, to accept blame, to apologize.",
        "They feel guilty or inferior.",
        "Desire to atone for mistakes.",
        "Need to be humble and compliant.",
        "The person shows deference to elders as a sign of respect, not weakness.",
    ],
    "nPlay": [
        "The person wants to have fun, to laugh, to relax.",
        "They engage in playful activities.",
        "Desire for enjoyment and amusement.",
        "Need for recreation and leisure."
    ],
    "nAcquisition": [
        "The individual wants to gain possessions, property, or resources.",
        "They are acquisitive and want to own things.",
        "Desire to collect or accumulate.",
        "Need for material wealth."
    ],
    "nSex": [
        "The person wants to form an erotic relationship.",
        "They have sexual desires or romantic feelings.",
        "Desire for intimacy and physical pleasure.",
        "Need for sexual expression."
    ],
    "nAggression": [
        "The individual wants to attack, hurt, or kill others.",
        "They express anger or hostility.",
        "Desire to overcome opposition forcefully.",
        "Need to fight or destroy."
    ],
    "nBlameAvoidance": [
        "The person wants to avoid blame, criticism, or punishment.",
        "They are sensitive to disapproval.",
        "Desire to be blameless and beyond reproach.",
        "Need to escape guilt or shame."
    ],
    "nCounteraction": [
        "The person wants to compensate for failure by trying again.",
        "They strive to overcome a weakness.",
        "Desire to make up for a loss or defeat.",
        "Need to reassert oneself after a setback."
    ],
    "nDefendance": [
        "The person wants to defend oneself against blame or criticism.",
        "They justify actions and resist attack.",
        "Desire to protect one's reputation.",
        "Need to offer explanations and excuses."
    ],
    "nExhibition": [
        "The person wants to impress others, to be seen and heard.",
        "They enjoy being the center of attention.",
        "Desire to show off and attract notice.",
        "Need for dramatic self-expression."
    ],
    "nOrder": [
        "The person wants to organize, arrange, and be tidy.",
        "They seek precision and orderliness.",
        "Desire to have things clean and structured.",
        "Need for routine and predictability."
    ],
    "nRejection": [
        "The person wants to exclude, ignore, or reject another.",
        "They separate themselves from others.",
        "Desire to snub or show disdain.",
        "Need to keep distance from disliked persons."
    ]
}

PRESS_PROTOTYPES = {
    "pDominance": [
        "An external force is trying to control or influence the person.",
        "Someone in authority gives orders or demands.",
        "The environment pressures the individual to conform.",
        "A person or situation dominates and restricts."
    ],
    "pNurturance": [
        "Someone offers help, support, or care.",
        "The environment is protective and comforting.",
        "A person provides nourishment or assistance.",
        "Situations that foster growth and well-being."
    ],
    "pLoss": [
        "The person experiences a loss of something valuable.",
        "Someone or something is taken away.",
        "A separation or death occurs.",
        "The individual is deprived of an important person or object."
    ],
    "pRejection": [
        "The person is rejected, excluded, or abandoned.",
        "Someone refuses to accept them.",
        "The individual faces disapproval or scorn.",
        "Relationships are denied or broken."
    ],
    "pAggression": [
        "The person is attacked, threatened, or harmed.",
        "Someone shows hostility or violence.",
        "The environment is dangerous and menacing.",
        "The individual faces physical or verbal aggression."
    ],
    "pPhysicalDanger": [
        "The environment poses a physical threat.",
        "There is risk of injury, death, or harm.",
        "The person is in a hazardous situation.",
        "Dangerous conditions exist."
    ],
    "pAffliction": [
        "The person suffers from illness, pain, or misfortune.",
        "There is physical or mental suffering.",
        "The individual is afflicted by disease or disability.",
        "Hardship and adversity are present."
    ],
    "pCompetition": [
        "The person faces rivals or competitors.",
        "There is a contest for resources or status.",
        "The environment demands striving against others.",
        "Others are vying for the same goal."
    ],
    "pLuck(Bad)": [
        "The person experiences bad luck or misfortune.",
        "Events are beyond their control and unfavorable.",
        "Fate seems to work against them.",
        "Unexpected negative events occur."
    ],
    "pAffiliation": [
        "The person is in a friendly, cooperative environment.",
        "Others offer companionship and belonging.",
        "Social connections are available.",
        "The atmosphere is warm and inviting."
    ]
}

CLINICAL_LABEL_PROTOTYPES = {
    "Trauma-Related Processing": "Emotional pain, acute distress, vulnerability, feeling overwhelmed, suffering, grief, and past injury.",
    "Internal Conflict / Defensive Modulation": "Suppression, internal friction, moral dilemma, hesitation, self-restraint, and behavioral avoidance.",
    "Goal-Directed Striving / Competence": "Ambition, desire to succeed, mastering obstacles, determination, focus, and striving for excellence.",
}

ENV_PROTOTYPES = {
    "Supportive": [
        "The family was warm and encouraging.",
        "Someone offered help and comfort.",
        "The atmosphere felt safe and accepting.",
        "People around were kind and supportive.",
        "There was a sense of belonging and warmth.",
    ],
    "Threatening": [
        "The environment was dangerous and hostile.",
        "Someone threatened or attacked.",
        "There was violence and fear in the air.",
        "The atmosphere was menacing and unsafe.",
        "People around were aggressive and cruel.",
    ],
    "Depriving": [
        "The person lacked basic needs and resources.",
        "Poverty and scarcity dominated the situation.",
        "There was nothing to eat or use.",
        "The environment was barren and empty.",
        "Essential things were missing or taken away.",
    ],
    "Controlling": [
        "Someone was giving orders and demanding obedience.",
        "The authority figure dominated and restricted freedom.",
        "Rules were strict and oppressive.",
        "There was no room for individual choice.",
        "The person was forced to comply without question.",
    ],
    "Rejection": [
        "The person was excluded and unwanted.",
        "Others refused to accept or acknowledge them.",
        "There was abandonment and betrayal.",
        "Nobody cared or listened to them.",
        "The person was pushed away and ignored.",
    ],
    "Competitive": [
        "People were competing for success and recognition.",
        "There was rivalry and pressure to outperform others.",
        "The atmosphere was about winning and achieving.",
        "Others were vying for the same goal.",
        "Comparison and contest dominated interactions.",
    ],
    "Chaotic": [
        "Everything was unpredictable and disordered.",
        "Random events disrupted the situation.",
        "There was no stability or routine.",
        "Bad luck and misfortune struck without warning.",
        "The world felt uncertain and out of control.",
    ],
    "Punitive": [
        "The person was being punished or blamed.",
        "There were harsh consequences for mistakes.",
        "Someone inflicted punishment or criticism.",
        "Guilt and blame permeated the situation.",
        "The atmosphere was judgmental and harsh.",
    ],
    "Nurturing": [
        "The mother held the child tenderly.",
        "Someone was caring for and protecting the person.",
        "The environment was gentle and protective.",
        "There was patient guidance and emotional safety.",
        "Warmth and love surrounded the person.",
    ],
    "Achievement-Oriented": [
        "The person was expected to succeed and excel.",
        "There was pressure to study or work hard.",
        "Education and accomplishment were central values.",
        "The environment demanded high performance.",
        "Success was the primary goal and expectation.",
    ],
    "Isolating": [
        "The person was completely alone.",
        "There was nobody around to help or talk to.",
        "The individual was cut off from human contact.",
        "Loneliness and solitude dominated the scene.",
        "Abandonment left the person isolated.",
    ],
    "Ambivalent": [
        "Mixed signals of support and rejection.",
        "The environment was simultaneously caring and critical.",
        "Contradictory emotions came from the same source.",
        "Approval and disapproval alternated unpredictably.",
        "The atmosphere shifted between warmth and coldness.",
    ],
}

DEFENSE_PROTOTYPES = {
    "Intellectualization": [
        "The person described the situation in abstract, analytical terms without emotion.",
        "They discussed the problem rationally, distancing from feelings.",
        "The narrative was overly logical, avoiding any emotional engagement.",
        "Events were observed and analyzed rather than felt.",
        "The protagonist approached the conflict as an intellectual puzzle.",
    ],
    "Repression": [
        "The person seemed to forget or omit important emotional details.",
        "Key events were avoided or glossed over quickly.",
        "The story was remarkably brief and impoverished given the stimulus.",
        "Critical information appeared to be unconsciously excluded.",
        "The narrative lacked affect as if painful feelings were pushed away.",
    ],
    "Suppression": [
        "The person consciously held back their emotional reaction.",
        "They chose not to express what they were feeling.",
        "Emotions were present but deliberately restrained and controlled.",
        "The protagonist forced themselves to stay composed despite distress.",
        "Feelings were acknowledged but intentionally pushed aside.",
    ],
    "Reaction Formation": [
        "They expressed the opposite of what they seemed to feel.",
        "A positive attitude masked underlying distress or anger.",
        "The cheerfulness felt forced and inappropriate given the situation.",
        "Love was expressed where hostility might be expected.",
        "Extreme kindness appeared to cover deeper resentment.",
    ],
    "Avoidance": [
        "The person turned away from the conflict entirely.",
        "They left the situation rather than confront it.",
        "Escape was chosen over engagement with the problem.",
        "The protagonist withdrew when emotions became intense.",
        "Difficult topics were sidestepped or redirected.",
    ],
    "Compliance": [
        "The person submitted to authority without resistance.",
        "They agreed to everything despite internal disagreement.",
        "Obedience replaced autonomous decision-making.",
        "The protagonist yielded their own wishes to satisfy others.",
        "Conformity was used as a strategy to avoid conflict.",
    ],
    "Projection": [
        "They attributed their own unacceptable feelings to another character.",
        "The person blamed others for emotions they could not accept in themselves.",
        "Internal conflicts were perceived as coming from external sources.",
        "The protagonist saw hostility in others that mirrored their own anger.",
        "Uncomfortable desires were located in other characters.",
    ],
    "Denial": [
        "The person refused to acknowledge an obvious reality.",
        "They acted as though the threatening situation did not exist.",
        "Facts were ignored or contradicted to avoid distress.",
        "The protagonist insisted everything was fine despite clear evidence otherwise.",
        "Reality was distorted to make the situation seem less threatening.",
    ],
    "Displacement": [
        "Anger was directed at a safer target instead of the real source.",
        "Emotions meant for one person were expressed toward someone else.",
        "Frustration was redirected to a weaker or less threatening figure.",
        "The protagonist took out their feelings on an unrelated person.",
        "Aggression was channeled away from the original source of conflict.",
    ],
    "Sublimation": [
        "Difficult emotions were channeled into creative or productive activity.",
        "The person transformed inner turmoil into something constructive.",
        "Anxiety was converted into focused work or artistic expression.",
        "Internal conflicts became motivation for positive achievement.",
        "The protagonist used their pain as fuel for growth.",
    ],
    "Rationalization": [
        "The person made logical excuses for emotionally driven behavior.",
        "They provided reasonable-sounding justifications for what they did.",
        "The protagonist explained away their actions with post-hoc reasoning.",
        "Uncomfortable choices were reframed as practical or necessary.",
        "Motives were reinterpreted to seem more acceptable.",
    ],
    "Undoing": [
        "The person tried to reverse or cancel out a harmful action.",
        "They performed compensatory acts to make up for past wrongs.",
    ],
    "Adaptive Coping": [
        "The person faced the challenge directly and sought a constructive solution.",
        "They expressed feelings honestly while managing the situation effectively.",
        "Conflict was acknowledged and addressed with emotional maturity.",
        "The protagonist balanced personal needs with situational demands.",
        "Difficult circumstances were met with resilience and realistic hope.",
    ],
}

CONFLICT_PROTOTYPES = {
    "Approach-Avoidance": [
        "The character wants something but is afraid to get it.",
        "Desire is blocked by fear of consequences.",
        "They are torn between moving forward and pulling back.",
        "Ambivalence about a goal due to perceived danger."
    ],
    "Desire-Prohibition": [
        "The character wants something that is forbidden.",
        "Internal moral standards block a strong impulse.",
        "They feel guilty about what they want to do.",
        "Authority or super-ego blocks the id drive."
    ],
    "Autonomy-Dependency": [
        "The character wants to be independent but feels they need help.",
        "Struggling between standing alone and relying on others.",
        "Resentment of dependency but fear of isolation.",
        "Trying to break free but feeling unable to survive alone."
    ],
    "Aggression-Guilt": [
        "The character wants to hurt someone but feels bad about it.",
        "Anger is expressed and then immediately regretted.",
        "Hostile impulses are checked by conscience.",
        "Fear of their own destructive potential."
    ],
    "Dominance-Submission": [
        "The character oscillates between taking charge and giving in.",
        "Struggle to assert authority versus fear of retaliation.",
        "Resenting control but afraid to lead.",
        "Power dynamic shifting rapidly."
    ],
    "Affiliation-Rejection": [
        "The character wants to be close but fears being hurt.",
        "Desire for intimacy blocked by fear of abandonment.",
        "Pushing people away to avoid being rejected.",
        "Loneliness versus safety in isolation."
    ]
}

_GENDER_PROTOTYPES = {
    "male": [
        "The patient is male.",
        "He is a man.",
        "The patient is a boy.",
        "Male gender identity.",
        "He identifies as male.",
    ],
    "female": [
        "The patient is female.",
        "She is a woman.",
        "The patient is a girl.",
        "Female gender identity.",
        "She identifies as female.",
    ],
    "nonbinary": [
        "The patient is non-binary.",
        "They identify as genderqueer.",
        "The patient uses they/them pronouns.",
        "Gender non-conforming identity.",
        "The patient identifies as genderfluid.",
    ],
}

def main():
    print("[1/3] Loading ONNX embedder...", flush=True)
    import onnxruntime as ort
    from transformers import AutoTokenizer
    from huggingface_hub import hf_hub_download

    model_path = hf_hub_download(repo_id="Xenova/all-MiniLM-L6-v2", filename="onnx/model_quantized.onnx")
    sess_opts = ort.SessionOptions()
    sess_opts.intra_op_num_threads = 2
    sess_opts.inter_op_num_threads = 1
    session = ort.InferenceSession(model_path, sess_options=sess_opts, providers=["CPUExecutionProvider"])
    tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

    def encode(sentences):
        if isinstance(sentences, str):
            sentences = [sentences]
        inputs = tokenizer(sentences, padding=True, truncation=True, max_length=128, return_tensors="np")
        feed = {
            "input_ids": inputs["input_ids"].astype(np.int64),
            "attention_mask": inputs["attention_mask"].astype(np.int64),
            "token_type_ids": inputs.get("token_type_ids", np.zeros_like(inputs["input_ids"])).astype(np.int64),
        }
        outputs = session.run(None, feed)
        token_embs = outputs[0]
        mask = np.broadcast_to(np.expand_dims(feed["attention_mask"], -1), token_embs.shape)
        sum_embs = np.sum(token_embs * mask, axis=1)
        sum_mask = np.clip(mask.sum(axis=1), 1e-9, None)
        mean_pooled = sum_embs / sum_mask
        norm = np.linalg.norm(mean_pooled, axis=1, keepdims=True)
        return (mean_pooled / np.clip(norm, 1e-9, None)).astype(np.float32)

    store = {}
    def encode_dict(pfx, d):
        print(f"  Encoding {pfx} ({len(d)} entries)...", flush=True)
        for k, sents in d.items():
            store[f"{pfx}__{k}"] = encode(sents)

    print("[2/3] Encoding all prototype categories...", flush=True)
    encode_dict("need", NEED_PROTOTYPES)
    encode_dict("press", PRESS_PROTOTYPES)
    encode_dict("clinical_label", CLINICAL_LABEL_PROTOTYPES)
    encode_dict("env", ENV_PROTOTYPES)
    encode_dict("defense", DEFENSE_PROTOTYPES)
    encode_dict("conflict", CONFLICT_PROTOTYPES)
    encode_dict("gender", _GENDER_PROTOTYPES)

    out_file = BACKEND_ROOT / "data" / "tat_prototypes.npz"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    print(f"[3/3] Saving {len(store)} arrays to {out_file}...", flush=True)
    np.savez_compressed(out_file, **store)
    size_kb = os.path.getsize(out_file) / 1024
    print(f"[SUCCESS] Created {out_file} ({size_kb:.1f} KB)", flush=True)

if __name__ == "__main__":
    main()
