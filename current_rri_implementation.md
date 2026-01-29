# Current RRI Implementation Documentation

## Overview
The **Retention Risk Index (RRI)** is calculated based on three primary components, weighted as follows:

| Component | Weight | Source Module |
| :--- | :--- | :--- |
| **Technical Skills** | **50%** | `backend/rri/technical_skills.py` |
| **Behavioral Competencies** | **30%** | `backend/rri/behavioral_competencies.py` |
| **Achievements & Awards** | **20%** | `backend/rri/achievements.py` |

The Final RRI Score (0-100) determines the retention band:
- **Green (High Retention)**: Score ≥ 80
- **Amber (Watchlist)**: Score 65 - 79
- **Red (Critical Risk)**: Score < 65

---

## 1. Technical Skills (50% of Total)
Each sub-component accounts for a percentage of the technical score. Scores are normalized to 0-100 before weighting.

### Sub-Components
| Parameter | Weight | Description |
| :--- | :--- | :--- |
| **Tactical Ops** | **30%** | Fieldcraft, battle drills. |
| **Firing** | **25%** | Marksmanship scores. |
| **Cognitive/SIT** | **25%** | Situation Reaction Tests, IQ. |
| **Weapon Handling** | **20%** | Stripping, assembling, jam clearing. |

### Logic: Recency Weighting
A "Recency Factor" is applied to raw scores to prioritize fresh data:
- **0 - 3 Months**: 100% Weight (1.0)
- **3 - 6 Months**: 80% Weight (0.8)
- **6 - 12 Months**: 50% Weight (0.5)
- **> 12 Months**: 0% Weight (Stale Data)

---

## 2. Behavioral Competencies (30% of Total)
Evaluated quarterly by the Company Commander/Platoon Commander. Scores (1-10) are averaged over time, with **outliers removed** (values > 2 standard deviations from mean).

### Sub-Components
| Parameter | Weight | Description |
| :--- | :--- | :--- |
| **Initiative** | **20%** | Proactiveness in tasks. |
| **Dedication** | **20%** | Commitment to duty. |
| **Team Spirit** | **18%** | Camaraderie and cooperation. |
| **Courage** | **18%** | Physical/Moral courage. |
| **Motivation** | **12%** | Overall morale. |
| **Adaptability** | **12%** | Adjustment to new environments. |

### Logic: Trend Detection
The system compares average scores of the most recent half of assessments vs the older half.
- **Improving**: Change > +1.0
- **Declining**: Change < -1.0
- **Stable**: Change within ±1.0

---

## 3. Achievements & Awards (20% of Total)
Specific events earn points which are summed up. The raw sum is **capped at 50 points** before being scaled to 100% for the component score.

### Categories & Points
| Category | Points Range | Validity |
| :--- | :--- | :--- |
| **Bravery / Gallantry** | 12 - 15 | **Infinite** |
| **Leadership** | 8 - 12 | 36 Months |
| **Technical Excellence** | 5 - 8 | 36 Months |
| **Innovation** | 4 - 6 | 24 Months |
| **Sports** | 3 - 5 | 24 Months |
| **Training Courses** | 3 - 5 | 24 Months |
| **Disciplinary** | **-3 to -5** | 12 Months |

### Logic: Time Decay (Depreciation)
Points for achievements (excluding Bravery) depreciate over time:
- **0 - 6 Months**: 100% Value
- **6 - 12 Months**: 85% Value
- **12 - 24 Months**: 60% Value
- **> 24 Months**: 0% (Expired)

---

## 4. Required Data Points
To implement the revised policy, please compare your document against these existing inputs:

**Technical**:
- Firing Score (0-100)
- Weapon Handling Score (0-100)
- Tactical Score (0-100)
- Cognitive Score (0-100)

**Behavioral** (Rated 1-10):
- Initiative, Dedication, Team Spirit, Courage, Motivation, Adaptability.

**Achievements**:
- Title, Category, Date Earned.
