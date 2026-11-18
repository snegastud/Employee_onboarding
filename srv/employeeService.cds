using {employeeSchema as db  } from '../db/employeeOnboardingSchema';



service employeeOnboarding{

    entity employee as projection on db.employee;

    entity onboardingCases as projection on db.onboardingCases;

    entity acknowledgement as projection on db.acknowledgement;

    entity assetAssignment as projection on db.assetAssignment;

    entity companyAsset as projection on db.companyAsset;

    entity onboardingTask as projection on db.onboardingTask;

    entity taskDependency as projection on db.taskDependency;

    entity taskType as projection on db.taskType;

    entity onboardingTemplate as projection on db.onboardingTemplate;

    entity employeeDocument  as projection on db.employeeDocument;

    entity templateTask as projection on db.templateTask;

    entity counterID as projection on db.counterID;
    
    entity taskTypeDependency as projection on db.taskTypeDependency;


   
    action createOnboardingCase( @mandatory employeeID:String, @mandatory templateID:String) returns onboardingCases;


    action confirmOnboardingCase( @mandatory caseID: String);

    action returnOnboardingCase( @mandatory caseID: String,@mandatory returnReason: String);

    action generateTasks( @mandatory caseID: String) returns TaskGenerationResult;

    type TaskGenerationResult{

    message: String;
    caseID: String;
    generatedTaskCount: Integer;
    generatedTaskCodes: String;

    }

  action completeTask(@mandatory taskID:UUID) returns String;

  action returnTask(@mandatory taskID: UUID,@mandatory documentID: UUID,@mandatory returnReason: String) returns String;

  action closeOnboarding( @mandatory caseID: UUID) returns String;


}