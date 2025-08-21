// Shared built-in care tips used by CareTips list and CareTipArticlePage
const DEFAULT_CARE_TIPS = [
  {
    id: 'cow-nutrition-1',
    title: 'Dairy Cow Energy & Protein Balance',
    category: 'nutrition',
    description: 'Balance energy (ME) and metabolizable protein to support lactation: increase digestible fiber, monitor body condition score (BCS) and supply rumen-undegradable protein when milk yield is high.',
    species: 'cow',
    keyPoints: [
      'Match dietary ME to milk yield to avoid negative energy balance',
      'Provide adequate metabolizable protein (MP) and consider rumen-undegradable protein for high producers',
      'Monitor BCS monthly and adjust rations accordingly'
    ],
    article: {
      title: 'Practical Feeding Strategies to Optimize Lactation Performance',
      content: 'High-yielding dairy cows require careful balance between energy and protein to sustain milk production without mobilizing excessive body reserves. Energy should come from a mix of fermentable carbohydrates and digestible fiber to maintain rumen health.\n\nMetabolizable protein (MP) is the fraction available to the cow after rumen fermentation. For cows in peak lactation, supplementing with sources of rumen-undegradable protein (RUP) can increase the supply of essential amino acids to the small intestine and improve milk protein yield.\n\nRegularly monitor body condition score (BCS) and milk components. If cows are losing BCS unexpectedly, increase energy density (for example, protected fats or rapidly fermentable carbohydrates balanced with effective fiber) and check for underlying health or environmental stressors.'
    },
    relatedTips: [
      { id: 'cow-health-1', title: 'Hoof Care and Lameness Prevention', description: 'Regular hoof care reduces lameness and production losses.' }
    ]
  },
  {
    id: 'cow-health-1',
    title: 'Hoof Care and Lameness Prevention',
    category: 'health',
    description: 'Inspect hooves regularly, maintain dry bedding, trim hooves when needed and treat early signs of foot rot to reduce production losses; lameness monitoring is a key welfare metric.',
    species: 'cow',
    keyPoints: [
      'Inspect hooves at least monthly',
      'Keep housing dry and clean to reduce infectious hoof problems',
      'Record and follow-up on lameness cases for herd-level trends'
    ],
    article: {
      title: 'Preventing and Managing Lameness in Dairy Herds',
      content: 'Lameness is one of the main welfare and productivity concerns in dairy herds. Causes include infectious diseases (e.g., foot rot), traumatic injuries, and nutritional disorders affecting hoof horn quality.\n\nPrevention focuses on good hygiene, regularly cleaned and well-drained alleys, and comfortable resting areas. Routine hoof trimming on a planned schedule keeps hoof shape balanced and reduces uneven weight bearing.\n\nEarly detection is critical: implement locomotion scoring and immediate treatment for affected animals. Work with your veterinarian to design a hoof health plan and consider nutritional interventions (e.g., biotin supplementation) when herd-level hoof horn quality is poor.'
    },
    relatedTips: [
      { id: 'cow-nutrition-1', title: 'Dairy Cow Energy & Protein Balance', description: 'Feeding influences hoof health via body condition and horn quality.' }
    ]
  },
  {
    id: 'chicken-nutrition-1',
    title: 'Layer Nutrition & Calcium',
    category: 'nutrition',
    description: 'Provide adequate calcium (e.g., limestone) and a balanced amino-acid profile to sustain eggshell quality; manage lighting to regulate laying cycles.',
    species: 'chicken',
    keyPoints: [
      'Ensure dietary calcium is available continuously for layers',
      'Balance amino acids (notably methionine and lysine) for egg production',
      'Manage daylength to control laying rhythm'
    ],
    article: {
      title: 'Optimizing Layer Diets for Egg Quality and Longevity',
      content: 'Eggshell formation demands a continuous supply of calcium during the night. Use a combination of coarse limestone and finely ground calcium in the feed to provide both immediate and sustained release.\n\nAmino-acid balance, especially methionine and lysine, affects egg size and albumen quality; formulate diets based on digestible amino acids. Avoid sudden dietary changes during peak lay to prevent drops in shell quality.\n\nLighting programs influence laying rate: maintain consistent photoperiods to prevent stress and irregular laying. Consider adding grit or free-choice oyster shell for layers with variable intake to ensure calcium adequacy.'
    },
    relatedTips: [
      { id: 'chicken-health-1', title: 'Biosecurity & Vaccination Basics', description: 'Healthy flocks better utilize nutrients and produce higher quality eggs.' }
    ]
  },
  {
    id: 'chicken-health-1',
    title: 'Biosecurity & Vaccination Basics',
    category: 'health',
    description: 'Limit visitors, separate age groups, control rodents, and follow a proven vaccination protocol (Newcastle, Marek where relevant) to reduce contagious disease risk.',
    species: 'chicken',
    keyPoints: [
      'Implement separate housing for different age groups',
      'Control vectors such as rodents and wild birds',
      'Follow regionally appropriate vaccination protocols'
    ],
    article: {
      title: 'Practical Biosecurity and Vaccination for Small and Medium Flocks',
      content: 'Small biosecurity measures can greatly reduce disease introduction and spread. Limit access to poultry houses, provide clean clothing and footwear for visitors, and keep feed storage secure from rodents.\n\nSeparate young and adult birds to reduce transmission of age-specific pathogens and maintain all-in/all-out cycles where possible.\n\nVaccination programs should be designed with local veterinary guidance: vaccines such as Newcastle disease and Marek can be critical in some regions. Maintain records and cold-chain integrity for vaccines.'
    },
    relatedTips: [
      { id: 'chicken-nutrition-1', title: 'Layer Nutrition & Calcium', description: 'Nutrition supports immune response and recovery.' }
    ]
  },
  {
    id: 'dog-health-1',
    title: 'Canine Parasite Control',
    category: 'health',
    description: 'Follow local vet guidance on deworming schedules and ectoparasite control; regular fecal checks and targeted anthelmintics reduce zoonotic transmission risks.',
    species: 'dog',
    keyPoints: [
      'Follow a vet-recommended deworming schedule',
      'Use combined strategies for ticks and fleas',
      'Test fecal samples periodically to target treatments'
    ],
    article: {
      title: 'Integrated Parasite Management for Farm Dogs',
      content: 'Farm dogs are exposed to a variety of parasites that can affect their health and pose zoonotic risks. An integrated approach combines environmental control, regular fecal monitoring, and strategic anthelmintic use.\n\nCoordinate deworming programs with local veterinary guidance and consider seasonal risk factors. Control ectoparasites (fleas, ticks) using topical or systemic products appropriate for the animal and setting.\n\nGood sanitation, prompt removal of feces, and regular grooming reduce parasite burdens and environmental contamination.'
    },
    relatedTips: []
  },
  {
    id: 'sheep-nutrition-1',
    title: 'Sheep Mineral Requirements',
    category: 'nutrition',
    description: 'Provide trace minerals (Se, Cu where appropriate), monitor for iodine and cobalt in low-risk regions, and adjust supplementation during pregnancy and lactation to avoid metabolic disease.',
    species: 'sheep',
    keyPoints: [
      'Tailor mineral programs to local soil and forage tests',
      'Increase energy and protein in late pregnancy',
      'Prevent both deficiency and toxicity (e.g., copper sensitivity in some breeds)'
    ],
    article: {
      title: 'Formulating Mineral and Energy Programs for Ewes',
      content: 'Trace mineral needs vary by region due to soil and forage composition. Perform forage or soil tests to identify common deficiencies (selenium, iodine, cobalt) and adjust supplementation accordingly.\n\nDuring late pregnancy, nutrient demand increases substantially; ewes need higher energy density and adequate protein to support fetal growth and prepare for lactation.\n\nBe cautious with minerals that can be toxic to sheep breeds (notably copper). Work with a nutritionist or veterinarian to set safe supplement levels and delivery methods (lick blocks, boluses, or incorporated into concentrate feeds).' 
    },
    relatedTips: [
      { id: 'sheep-health-1', title: 'Management of Internal Parasites', description: 'Parasite control and nutrition interact to determine productivity.' }
    ]
  },
  {
    id: 'sheep-health-1',
    title: 'Management of Internal Parasites',
    category: 'health',
    description: 'Use targeted selective treatment based on FAMACHA/egg counts, rotate pastures and avoid blanket treatments to slow anthelmintic resistance development.',
    species: 'sheep',
    keyPoints: [
      'Use targeted selective treatments guided by diagnostics',
      'Rotate pastures and avoid overstocking',
      'Record treatments and monitor for resistance'
    ],
    article: {
      title: 'Sustainable Control of Gastrointestinal Nematodes in Sheep',
      content: 'Gastrointestinal nematodes are a major constraint for sheep producers. Over-reliance on anthelmintics has driven resistance in many regions.\n\nImplement targeted selective treatment (TST) where only animals showing clinical signs or high egg counts are treated. Use FAMACHA scoring for barber pole worm (Haemonchus) and perform periodic fecal egg counts to inform decisions.\n\nPasture management, mixed grazing, and genetic selection for resilient animals complement chemical control. Keep records of products used and test efficacy with fecal egg count reduction tests when resistance is suspected.'
    },
    relatedTips: []
  },
  {
    id: 'plants-soil-1',
    title: 'Soil Testing & Nutrient Management',
    category: 'nutrition',
    description: 'Regular soil tests (pH, P, K, organic matter) guide fertilizer plans; liming acidic soils and matching N-P-K to crop needs increases yields and reduces environmental losses.',
    species: 'plant',
    keyPoints: [
      'Test soils every 2-4 years or when yields fall',
      'Apply lime to correct pH before major fertilization',
      'Base N-P-K applications on crop removal and test results'
    ],
    article: {
      title: 'Using Soil Tests to Improve Crop Nutrition and Efficiency',
      content: 'Soil testing is the foundation of efficient nutrient management. Laboratory analyses provide pH, available phosphorus (P), potassium (K), and organic matter estimates that inform fertilizer decisions.\n\nAcid soils often limit nutrient availability; correcting pH with lime can improve uptake and reduce the need for large fertilizer applications. Match fertilizer type and timing to crop demand and root uptake windows to reduce losses.\n\nIntegrate organic matter building practices (cover crops, residue retention) to improve cation exchange capacity and nutrient-holding capacity over time.'
    },
    relatedTips: [
      { id: 'plants-water-1', title: 'Irrigation Scheduling & Water Use Efficiency', description: 'Efficient irrigation helps crops use applied nutrients effectively.' }
    ]
  },
  {
    id: 'plants-water-1',
    title: 'Irrigation Scheduling & Water Use Efficiency',
    category: 'exercise',
    description: 'Use soil moisture monitoring and crop evapotranspiration (ETc) estimates to schedule irrigation; deficit irrigation can save water while minimizing yield loss for some crops.',
    species: 'plant',
    keyPoints: [
      'Use soil moisture sensors or tensiometers to guide irrigation timing',
      'Schedule irrigation around critical growth stages',
      'Consider deficit irrigation where appropriate to save water'
    ],
    article: {
      title: 'Principles of Irrigation Scheduling for Improved Water Use',
      content: 'Irrigation scheduling should align water applications with crop demand and soil water-holding capacity. Use either soil moisture sensing or reference evapotranspiration (ETo) adjusted by crop coefficients (Kc) to estimate crop water needs (ETc).\n\nApply water in amounts the soil can hold in the root zone and avoid excessive deep percolation. For many crops, deficit irrigation during non-critical stages can reduce water use with limited yield penalty; however, this requires careful management.\n\nCombine good irrigation scheduling with practices that improve infiltration and reduce runoff (e.g., mulch, reduced tillage) and monitor salinity where irrigation water quality is marginal.'
    },
    relatedTips: [
      { id: 'plants-soil-1', title: 'Soil Testing & Nutrient Management', description: 'Soil health and irrigation scheduling work together to improve yields.' }
    ]
  }
];

export default DEFAULT_CARE_TIPS;
