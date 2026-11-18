namespace employeeSchema;

using {managed,cuid} from '@sap/cds/common';


 @assert.enum
type EmployeeType : String enum {
    PERMANENT;
    INTERN;
    CONTRACT;
};

type LocationName : String(100);

@assert.unique.employeeEmail: [employeeEmail]

@assert.unique.employeeID : [employeeID]

entity employee:cuid,managed{

    

    employeeID:String;
    employeeName:String  @mandatory;
    @assert.unique
    employeeEmail:String  @assert.format: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.com$';
    employeeDepartment:String @mandatory;
    employeeDesignation:String @mandatory;
    employeeJoiningDate:Date  @mandatory;
   
    employeeType: EmployeeType @mandatory;
    employeeLocation:LocationName @mandatory;
    reportingManager:String  @mandatory;
    employeeStatus:String enum{
        ACTIVE;INACTIVE
    } default 'ACTIVE';
  
    employeeAsset:Association to many assetAssignment on employeeAsset.employee=$self;

    employeeOnboardingCases:Association to many onboardingCases on employeeOnboardingCases.employeeTrackHistory=$self;
 
    employeeAck:Association to many acknowledgement on employeeAck.employeeack=$self;
}


@assert.unique.templateCode: [templateCode]
entity onboardingTemplate:cuid,managed{

    templateCode:String ;
    templateName:String @mandatory;
    employeeType:EmployeeType @mandatory;
    isActive: Boolean default true @mandatory;
    templateTasks: Composition of many templateTask  on templateTasks.onboardingTemplate = $self;
    templateDepartment: String @mandatory;
    templateLocation: LocationName @mandatory;
 
}

@assert.unique.taskTypeCode: [taskTypeCode]
entity taskType:cuid,managed{

    taskTypeCode:String;
    taskTypeName:String @mandatory;
    description:String  @mandatory;
    assignedDepartment:String  @mandatory;
    isActive:Boolean default true  @mandatory;
    task:Association to many templateTask on task.taskType=$self;
}



entity templateTask:cuid{

  
    onboardingTemplate:Association to  onboardingTemplate  @mandatory @assert.target;
    taskType:Association to  taskType  @mandatory @assert.target;

}


@assert.unique.assetCode: [assetCode]
@assert.unique.serialNumber: [serialNumber]

entity companyAsset :cuid, managed {
  
    assetCode: String(30) ;
    assetName: String(100) @mandatory;
    @assert.enum
    assetCategory: String enum{
    LAPTOP;
    DESKTOP;
    MONITOR;
    NETWORK_DEVICE;
    MOBILE_DEVICE;
    STORAGE_DEVICE;
    ACCESSORY;
    }
    manufacturer: String(100) @mandatory;
    model: String(100) @mandatory;
    serialNumber: String(100) @mandatory;

    purchaseDate: Date;
    warrantyExpiryDate: Date ;
    @assert.enum
    assetStatus: String enum {

        AVAILABLE;
        ASSIGNED;
        MAINTENANCE;
        RETIRED;
        LOST;
    } default 'AVAILABLE';
    assetLocation: LocationName @mandatory;
    reuseAssetOverTime:Association to many assetAssignment on reuseAssetOverTime.companyAsset=$self;
}


@assert.unique.caseID: [caseID]
entity onboardingCases:cuid,managed{


    caseID:String @mandatory;
    @assert.target
    employeeTrackHistory:Association to employee @mandatory;
    @assert.enum
    caseStatus:String enum{
    
        PENDING_CONFIRMATION;
        RETURNED;
        CONFIRMED;
        IN_PROGRESS;
        COMPLETED;
        CANCELLED;
    } default 'PENDING_CONFIRMATION';
    completedAt:Timestamp;
    onboardingDocuments:Composition of many employeeDocument on onboardingDocuments.onboardingCase=$self;
    OnboardingTask:Composition of many onboardingTask on OnboardingTask.onboardingCasesTask=$self;
    @assert.target
    template:Association to onboardingTemplate @mandatory;
    acknowledgementCase:Association to many acknowledgement on acknowledgementCase.onboardingCaseAck=$self;
    taskDependencies: Composition of many taskDependency on taskDependencies.onboardingCase = $self;
}

@assert.unique.taskCode: [taskCode]
entity onboardingTask : cuid,managed {
  
    taskCode : String(30) ;
    taskName: String(100) @mandatory;
    description: String(500) @mandatory;
    @assert.enum
    taskStatus: String enum {
        PENDING;
        IN_PROGRESS;
        COMPLETED;
        OVERDUE;
        CANCELLED;
    } default 'PENDING';
    assignedDepartment: String(50) @mandatory;

    @cds.api.ignore
    assignedTo: String(100) ;
    dueDate: Date @mandatory;
    completedAt: Timestamp ;
    @assert.target
    onboardingCasesTask: Association to onboardingCases;
    @assert.target
    taskType: Association to one taskType;
}


@assert.unique.documentCode: [documentCode]
entity employeeDocument : cuid,managed {

    documentCode: String(30) ;
    documentName: String(100) @mandatory;
    @assert.enum
    documentType :String enum {
    PROFILE_PHOTO;
    IDENTITY_PROOF;
    ADDRESS_PROOF;
    EDUCATION_CERTIFICATE;
    SIGNED_OFFER_LETTER;
};
    fileName: String(255) @mandatory;
    fileType: String(50) @mandatory;
    content: LargeBinary @Core.MediaType: fileType;
  
    @assert.enum
    documentStatus: String enum {
        PENDING;
        SUBMITTED;
        VERIFIED;
        REJECTED;
        RESUBMISSION_REQUIRED;
    } default 'PENDING';
    uploadedAt: Timestamp;
    verifiedBy: String(100);
    verifiedAt: Timestamp;
    rejectionReason: String(500) ;
    onboardingCase: Association to one onboardingCases  @mandatory @assert.target;
}
@assert.unique.assignmentCode: [assignmentCode]
entity assetAssignment : cuid,managed {

    assignmentCode: String(30) ;
    assignedDate: Date   ;
    assignedBy: String(100)  @mandatory;
    @assert.enum
    assignmentStatus: String enum {
        PENDING;
        ASSIGNED;
        RETURNED;
        LOST;
        DAMAGED;
    };
    expectedReturnDate: Date  ;
    actualReturnDate: Date  ;
    returnCondition: String(100) ;
    employee: Association to one employee  @assert.target;
    companyAsset: Association to one companyAsset  @assert.target;
    acknowledgementAsset:Association to  many acknowledgement on acknowledgementAsset.assetAssignmentAck=$self;

}

@assert.unique.acknowledgementCode: [acknowledgementCode]
entity acknowledgement :cuid, managed {

    acknowledgementCode: String(30)  @mandatory;
    acknowledgementType: String(50)  @mandatory;
    @assert.enum
    acknowledgementStatus: String enum {
        PENDING;
        ACCEPTED;
        DECLINED;
    } default 'PENDING';

    acknowledgementText: String(500)  @mandatory;

    acknowledgedAt: Timestamp;
    acknowledgedBy: String(100);

    policyVersion: String(30);
    signatureReference: String(255);

    employeeack: Association to one employee   @mandatory @assert.target;

    assetAssignmentAck: Association to one assetAssignment   @mandatory @assert.target;

    onboardingCaseAck: Association to one onboardingCases   @mandatory @assert.target;
}

entity taskDependency:cuid,managed{

    predecessorTask: Association to one onboardingTask    @mandatory @assert.target;
    successorTask: Association to one onboardingTask   @mandatory @assert.target;
    onboardingCase: Association to one onboardingCases    @mandatory @assert.target;

}

@assert.unique.counterName: [counterName]
entity counterID:cuid{
    counterName:String  @mandatory;
    prefix:String  @mandatory;
    lastNumber:Integer  @mandatory;
}

entity taskTypeDependency: cuid, managed {

    predecessorTaskType: Association to one taskType
        @mandatory @assert.target;

    successorTaskType: Association to one taskType
        @mandatory @assert.target;

}