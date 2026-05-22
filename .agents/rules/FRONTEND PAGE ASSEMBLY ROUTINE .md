---
trigger: always_on
---

Context: We are continuing the Frontend development. To prevent context loss, you must strictly follow this Standard Operating Procedure (SOP) for the current page.


  use FIGMA via msp "https://www.figma.com/design/1qnHPMWbDOjGf7fTI4kwm6/interface?"
    STRICT WORKFLOW (Do not skip steps):

    STEP 1: API & Backend Audit

        Identify the data required for this page based on the Figma design and the corently page .

        Check our local routes/ and controllers/ to see if the EXACT endpoints exist and work properly.

        Rule: If an API is missing or incomplete, STOP. Tell me what is missing and ask for permission to write the backend code first using the @clean_student_coder  skill.


  STEP 2: Figma Extraction & CSS  
STEP 3: React Component Build
        Write the functional React component.
 Connect it to the backend 

        Verify that all buttons and forms on this page are wired to a function (no dead ends).



    STEP 4: State & Roadmap Update

 Once the page is complete, automatically update DEV_ROADMAP.md to check [x] for this page so we never lose track.

