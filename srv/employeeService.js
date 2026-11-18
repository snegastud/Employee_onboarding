const cds = require('@sap/cds');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');



module.exports=cds.service.impl(function (){

    const {employee,onboardingCases,acknowledgement,assetAssignment,companyAsset,onboardingTask,taskDependency,taskType,onboardingTemplate,employeeDocument,templateTask,counterID,taskTypeDependency}=this.entities;

    
    this.before('CREATE', employee, async (req) => {

     const counter = await SELECT.one.from(counterID).where({ counterName: 'EMPLOYEE' });

        console.log('Employee counter:', counter);



    if (!counter) {
        return req.reject(500, 'Employee Counter Configuration Not Found');
    }

    const nextNumber = counter.lastNumber + 1;

    const generatedEmployeeID = counter.prefix + String(nextNumber).padStart(3, '0');

    req.data.employeeID = generatedEmployeeID;

    await UPDATE(counterID) .set({ lastNumber: nextNumber }).where({ ID: counter.ID });

});


this.before('CREATE', onboardingTemplate, async (req) => {

    const counter = await SELECT.one.from(counterID) .where({ counterName: 'ONBOARDING_TEMPLATE' });

    if (!counter) {
        return req.reject(500, 'Onboarding Template Counter Configuration Not Found');
    }

    const nextNumber = counter.lastNumber + 1;

    const generatedTemplateCode =  counter.prefix + String(nextNumber).padStart(3, '0');

    req.data.templateCode = generatedTemplateCode;

    await UPDATE(counterID).set({ lastNumber: nextNumber }).where({ ID: counter.ID });

});

this.before('CREATE', taskType, async (req) => {

    const counter = await SELECT.one.from(counterID) .where({ counterName: 'TASK_TYPE' });

    if (!counter) {
        return req.reject(500, "Task Type Counter Configuration Not Found");
    }

    const nextNumber = counter.lastNumber + 1;

    const generatedTaskTypeCode =counter.prefix + String(nextNumber).padStart(3, '0');

    req.data.taskTypeCode = generatedTaskTypeCode;

    await UPDATE(counterID) .set({ lastNumber: nextNumber }) .where({ ID: counter.ID });

});




this.before('CREATE',templateTask,async(req)=>{

    const {onboardingTemplate_ID,taskType_ID}=req.data;

     if (!onboardingTemplate_ID) {
        req.reject(400, "Onboarding Template Reference is Required");
    }

    if (!taskType_ID) {
        req.reject(400, "Task Type Reference is Required");
    }
    
    const existingTemplate = await SELECT.one.from(onboardingTemplate).where({ ID: onboardingTemplate_ID });

    if (!existingTemplate) {
        req.reject(400, "Referenced Onboarding Template Does Not Exist");
    }

    const existingTaskType = await SELECT.one.from(taskType).where({ ID: taskType_ID });

    if (!existingTaskType) {
        req.reject(400, "Referenced Task Type Does Not Exist");
    }

    const existingMapping = await SELECT.one.from(templateTask).where({onboardingTemplate_ID,taskType_ID});

    if (existingMapping) {
        req.reject(409, "This Task Type Is Already Assigned To This Template");

    }
});


  this.on('createOnboardingCase',async(req)=>{
    
    const {employeeID,templateID}=req.data;


    
    const existEmployee=await SELECT.one.from(employee).where({ID:employeeID});

    if(!existEmployee){

        req.reject(404,"Employee id is not found");
    }

    const existTemplate=await SELECT.one.from(onboardingTemplate).where({ID:templateID});

    if(!existTemplate){
        
        req.reject(404,"Onboarding template id is not found");
    }

    if(existEmployee.employeeType!==existTemplate.employeeType){

        req.reject(404,"Templatetype not matched.")
    }

     if (existEmployee.employeeDepartment !== existTemplate.templateDepartment) {
        return req.reject(400, "Employee Department Does Not Match Template");
    }

    if (existEmployee.employeeLocation !== existTemplate.templateLocation) {
        return req.reject(400, "Employee Location Does Not Match Template");
    }

    if(existTemplate.isActive!==true){
        
        req.reject(400,"Selected Template Is Inactive")
    }
    

    const counter=await SELECT.one.from(counterID).where({counterName:'ONBOARDING_CASE'});



    if (!counter) {
        return req.reject(500, "Onboarding Case Counter Configuration Not Found");
    }

      const nextNumber = counter.lastNumber + 1;

   

     const caseID = counter.prefix + String(nextNumber).padStart(3, '0');

     await UPDATE(counterID).set({ lastNumber: nextNumber }).where({ ID: counter.ID });


     await INSERT.into(onboardingCases).entries({caseID: caseID,employeeTrackHistory_ID: existEmployee.ID,template_ID: existTemplate.ID,caseStatus: 'PENDING_CONFIRMATION'});

      return {
        message: "Onboarding Case Created Successfully",
        caseID: caseID,
        employeeID: existEmployee.ID,
        templateID: existTemplate.ID,
        caseStatus: 'PENDING_CONFIRMATION'
    };

  });


  this.on('confirmOnboardingCase', async req => {

    const { caseID } = req.data;

    const onboardingCase = await SELECT.one.from(onboardingCases).where({ caseID });

    if (!onboardingCase) {
        return req.reject(404, 'Onboarding Case Not Found');
    }

    if (onboardingCase.caseStatus !== 'PENDING_CONFIRMATION') {
        return req.reject(400, 'Only Pending Confirmation Cases Can Be Confirmed');
    }

    await UPDATE(onboardingCases) .set({caseStatus: 'CONFIRMED',confirmedAt: new Date()})  .where({ ID: onboardingCase.ID });

    return await SELECT.one.from(onboardingCases).where({ ID: onboardingCase.ID });

});

  this.on('returnOnboardingCase', async req => {

    const { caseID, returnReason } = req.data;

   

    const onboardingCase = await SELECT.one.from(onboardingCases).where({ caseID });

    if (!onboardingCase) {
        return req.reject(404, 'Onboarding Case Not Found');
    }

    if (onboardingCase.caseStatus !== 'PENDING_CONFIRMATION') {
        return req.reject(400, 'Only Pending Confirmation Cases Can Be Returned');
    }

    await UPDATE(onboardingCases).set({caseStatus: 'RETURNED',returnReason:returnReason}).where({ ID: onboardingCase.ID });

    return await SELECT.one.from(onboardingCases).where({ ID: onboardingCase.ID });

});


     this.on('generateTasks',async(req)=>{

        const {caseID}=req.data;

        const existCaseID=await SELECT.one.from(onboardingCases).where({caseID:caseID});


        if(!existCaseID){
            return req.reject(404,"CASE ID NOT FOUND");
        }

        if(existCaseID.caseStatus!=='CONFIRMED'){

            return req.reject(400,"ONLY CONFIRMED STATUS ONLY ALLOWED TO GENERATE TASK");

        }

         const existingTasks = await SELECT.one.from(onboardingTask).where({ onboardingCasesTask_ID: existCaseID.ID });


        if (existingTasks) {

        return req.reject(409, "TASKS ALREADY GENERATED FOR THIS CASE");

    }


        const template=await SELECT.one.from(onboardingTemplate).where({ID:existCaseID.template_ID});

        if(!template){

            return req.reject(400,"ONBOARDINGTEMPLATE NOT FOUND FOR THIS ONBOARDINGCASES" );

        }


       const employeeDetails=await SELECT.one.from(employee).where({ID:existCaseID.employeeTrackHistory_ID});


       if(!employeeDetails){

        return req.reject(404,"EMPLOYEE NOT FOUND FOR THIS ONBOARDING CASE");


       }


      const taskMapping=await SELECT.from(templateTask).where({onboardingTemplate_ID:existCaseID.template_ID});

      if(taskMapping.length===0){

        return req.reject(404,"NO TASK MAPPINGS FOUND FOR THIS TEMPLATE");

      }

        const onboardingTaskCount=await SELECT.one.from(counterID).where({counterName:'ONBOARDING_TASK'});

        if(!onboardingTaskCount){

            return req.reject(404,"ONBOARDINGTASK COUNTERID NOT FOUND")
        }

        let nextNumber=onboardingTaskCount.lastNumber;

        const taskEntries = [];

        const generatedTaskCodes = [];


      for (let i =0;i<taskMapping.length;i++){


        const taskDetails=await SELECT.one.from(taskType).where({ID:taskMapping[i].taskType_ID});

        if(!taskDetails){

            return req.reject(404,"TASK DETAILS NOT FOUND HERE")
        }
   

        nextNumber++;
      
        const generatedTaskCode = onboardingTaskCount.prefix + String(nextNumber).padStart(3, '0');

        const taskEntry={

        taskCode:generatedTaskCode,
        taskName:taskDetails.taskTypeName,
        description:taskDetails.description,
        assignedDepartment:taskDetails.assignedDepartment,
        dueDate:employeeDetails.employeeJoiningDate,
        onboardingCasesTask_ID:existCaseID.ID,
        taskType_ID:taskMapping[i].taskType_ID


};

   taskEntries.push(taskEntry);

   generatedTaskCodes.push(generatedTaskCode);


 }

       const onboardingTaskValues=await INSERT.into(onboardingTask).entries(taskEntries);



      // its reterive the generate the task id

       const  generateTaskType=await SELECT.from(onboardingTask).columns('ID', 'taskType_ID').where({onboardingCasesTask_ID:existCaseID.ID});


       const dependencyRules=await SELECT.from(taskTypeDependency);


       const taskTypeMap = new Map();

       for (const task of generateTaskType) {

       taskTypeMap.set(task.taskType_ID, task.ID);

    }

        

        const dependencyEntries = [];

             for (const rule of dependencyRules) {

                const predecessorID = taskTypeMap.get(rule.predecessorTaskType_ID);

                const successorID = taskTypeMap.get(rule.successorTaskType_ID);


                if (predecessorID && successorID) {

                dependencyEntries.push({


                  predecessorTask_ID: predecessorID,

                  successorTask_ID: successorID,

                  onboardingCase_ID: existCaseID.ID

            });

    }

}


              if (dependencyEntries.length > 0) {

                   await INSERT.into(taskDependency).entries(dependencyEntries);

            }


       await UPDATE(counterID) .set({ lastNumber: nextNumber }).where({ ID: onboardingTaskCount.ID });

       await UPDATE(onboardingCases).set({caseStatus:'IN_PROGRESS'}).where({caseID:existCaseID.caseID});


    return {
        message: "ONBOARDING TASKS GENERATED SUCCESSFULLY",
        caseID: caseID,
        totalTasksGenerated: taskEntries.length,
        generatedTaskCodes: generatedTaskCodes
    };


   

});


 this.before('CREATE',employeeDocument,async(req)=>{


    const {onboardingCase_ID}=req.data;


      const onboardingCaseExist= await SELECT.one.from(onboardingCases).where({ID:onboardingCase_ID});

    if(!onboardingCaseExist){

        return req.reject(404,"ONBORADING CASE NOT FOUND");
    }


    if(onboardingCaseExist.caseStatus==='COMPLETED'){

        return req.reject(400,"COMPLETED DOCUMENT DOESN'T ALLOW TO SUMBIT THE DOCUMENTS")
    }

    if(onboardingCaseExist.caseStatus==='CANCELLED'){

        return req.reject(400,"CANCELLED STATUS DOESN'T ALLOW TO SUMBIT THE DOUCMENTS")
    }
    
    const counter = await SELECT.one.from(counterID).where({counterName: 'EMPLOYEE_DOCUMENT' });
    


      if (!counter) {
        return req.reject(500, 'Employee document Counter Configuration Not Found');
    }

    const nextNumber = counter.lastNumber + 1;

    const generatedEmployeeDocument = counter.prefix + String(nextNumber).padStart(3, '0');

    req.data.documentCode = generatedEmployeeDocument;

    await UPDATE(counterID) .set({ lastNumber: nextNumber }).where({ ID: counter.ID });


  
});



this.before('UPDATE', employeeDocument, async (req) => {


    if (!Object.hasOwn(req.data, 'content')) {
        return;
    }

 
    const { ID } = req.data;

    if (!ID) {
        return req.reject(400, 'DOCUMENT ID IS REQUIRED');
    }

   
    const documentExist = await SELECT.one .from(employeeDocument).where({ ID: ID });

    if (!documentExist) {
        return req.reject(404, 'EMPLOYEE DOCUMENT NOT FOUND');
    }


    const onboardingCaseExist = await SELECT.one.from(onboardingCases).where({ ID: documentExist.onboardingCase_ID });

    if (!onboardingCaseExist) {
        return req.reject(404, 'ONBOARDING CASE NOT FOUND');
    }


    if (onboardingCaseExist.caseStatus === 'COMPLETED' || onboardingCaseExist.caseStatus === 'CANCELLED') 
        {
        return req.reject( 400,'DOCUMENT UPLOAD NOT ALLOWED FOR THIS ONBOARDING CASE');
    }

 
    if (documentExist.documentStatus === 'VERIFIED') {
        return req.reject( 400,'VERIFIED DOCUMENT CANNOT BE OVERWRITTEN');
    }

    req.data.uploadedAt = new Date();
    req.data.documentStatus = 'SUBMITTED';

});


this.before('CREATE', companyAsset, async (req) => {

    const counter = await SELECT.one.from(counterID)
        .where({ counterName: 'COMPANY_ASSET' });

    console.log('Company Asset counter:', counter);

    if (!counter) {
        return req.reject(500, 'Company Asset Counter Configuration Not Found');
    }

    const nextNumber = counter.lastNumber + 1;

    const generatedAssetCode = counter.prefix + String(nextNumber).padStart(3, '0');

    req.data.assetCode = generatedAssetCode;

    await UPDATE(counterID) .set({ lastNumber: nextNumber })  .where({ ID: counter.ID });

});



 this.on('completeTask',async(req)=>{


    const {taskID}=req.data;


    const existOnboardingTask=await SELECT.one.from(onboardingTask).where({ID:taskID});


    if(!existOnboardingTask){

        return req.reject(404,"ONBOARDIN TASK DOESN'T EXSIT")
    }

    if(existOnboardingTask.taskStatus==='COMPLETED')
    {

        return req.reject(409,"ONBORADING TASK ALREADY COMPLETED");
    } 
    if(existOnboardingTask.taskStatus==='CANCELLED'){

        return req.reject(409,"ONBOARDING TASK ALREAD CANCELLED")

    }


    const existTask=await SELECT.one.from(taskType).where({ID:existOnboardingTask.taskType_ID});

    if(!existTask){

        return req.reject(400,"TASK TYPE DOESN'T EXIST")
    }


    const  existOnboardingCase=await SELECT.one.from(onboardingCases).where({ID:existOnboardingTask.onboardingCasesTask_ID});

    if(!existOnboardingCase){

        return req.reject(400,"ONBOARDING CASE DOESN'T EXIST FOR THIS ONBOARDING TASK")
    }

    if(existOnboardingCase.caseStatus==='COMPLETED'){

        return req.reject(400,"ONBOARDING CASE IS ALREADY CLOSED")
    }

    
    if(existOnboardingCase.caseStatus==='CANCELLED'){

        return req.reject(400,"ONBOARDING CASE IS ALREADY CANCELLED")
    }


        const dependencies = await SELECT.from(taskDependency).columns('predecessorTask_ID').where({successorTask_ID: taskID,onboardingCase_ID: existOnboardingCase.ID});


    for (const dependency of dependencies) {

        const predecessorTask = await SELECT.one .from(onboardingTask).where({ ID: dependency.predecessorTask_ID });

        if (!predecessorTask) {
            return req.reject(400, "PREDECESSOR TASK DOESN'T EXIST");
        }

        if (predecessorTask.taskStatus !== 'COMPLETED') {
            return req.reject( 409,`PLEASE COMPLETE ${predecessorTask.taskName} BEFORE COMPLETING ${existOnboardingTask.taskName}`);
        }
    }


    

    if (existTask.taskTypeName === 'Document Verification') {

        const requiredDocumentTypes = ['IDENTITY_PROOF','ADDRESS_PROOF','EDUCATION_CERTIFICATE' ];

        const caseDocuments = await SELECT.from(employeeDocument).columns('documentType', 'documentStatus').where({onboardingCase_ID: existOnboardingCase.ID});


        const allDocumentsVerified = requiredDocumentTypes.every(type =>
            caseDocuments.some(document =>document.documentType === type && document.documentStatus === 'VERIFIED' )
        );


        if (!allDocumentsVerified) {

            return req.reject(  409,"IDENTITY PROOF, ADDRESS PROOF AND EDUCATION CERTIFICATE MUST ALL BE VERIFIED BEFORE COMPLETING DOCUMENT VERIFICATION");

        }
    }

    if (existTask.taskTypeName === 'Laptop Allocation') {

        const employeeID = existOnboardingCase.employeeTrackHistory_ID;

        const employeeAssignments = await SELECT.from(assetAssignment) .columns('ID', 'companyAsset_ID').where({employee_ID: employeeID,assignmentStatus: 'ASSIGNED'  });


        let laptopAssigned = false;

        for (const assignment of employeeAssignments) {

            const assignedAsset = await SELECT.one .from(companyAsset).where({ID: assignment.companyAsset_ID,assetCategory: 'LAPTOP', assetStatus: 'ASSIGNED'});

            if (assignedAsset) {
                laptopAssigned = true;
                break;
            }
        }


        if (!laptopAssigned) {
            return req.reject(  409,"A LAPTOP MUST BE ASSIGNED TO THE EMPLOYEE BEFORE COMPLETING LAPTOP ALLOCATION");
        }
    }

    await UPDATE(onboardingTask) .set({taskStatus: 'COMPLETED',completedAt: new Date()}).where({ ID: taskID });


    return `${existTask.taskTypeName} COMPLETED SUCCESSFULLY`;


 });


 this.before('CREATE',assetAssignment,async(req)=>{

    const {employee_ID,companyAsset_ID} =req.data;

    if(!employee_ID){

        return req.reject(400,"EMPLOYEE ID IS REQUIRED")
    }
    
    if(!companyAsset_ID){

        return req.reject(400,"COMPANY ASSET ID IS REQUIRED");
    }

    const existEmp=await SELECT.one.from(employee).where({ID:employee_ID});

    if(!existEmp){

        return req.reject(404,"EMPLOYEE ID NOT FOUND")
    }

    const existCompanyAsset=await SELECT.one.from(companyAsset).where({ID:companyAsset_ID});

    if(!existCompanyAsset){

        return req.reject(404,"COMPANY ASSET NOT FOUND")
    }

    if(existCompanyAsset.assetStatus!=='AVAILABLE'){

          return req.reject(400, 'THIS ASSET IS NOT AVAILABLE FOR ASSIGNMENT');


    }
    

     const existingAssignment = await SELECT.one .from(assetAssignment).where({companyAsset_ID: companyAsset_ID,assignmentStatus: 'ASSIGNED'});


      if (existingAssignment) {
        return req.reject(409, 'THIS ASSET IS ALREADY ASSIGNED TO ANOTHER EMPLOYEE');

    }

    const counter = await SELECT.one .from(counterID).where({ counterName: 'ASSET_ASSIGNMENT'});

    if (!counter) {
        return req.reject(404,'ASSET ASSIGNMENT COUNTER CONFIGURATION NOT FOUND');
    }

    const nextNumber = counter.lastNumber + 1;

    const generatedAssignmentCode = counter.prefix + String(nextNumber).padStart(3, '0');

    req.data.assignmentCode = generatedAssignmentCode;

    await UPDATE(counterID).set({ lastNumber: nextNumber }).where({ ID: counter.ID });


    req.data.assignmentStatus = 'ASSIGNED';


    if (!req.data.assignedDate) {

        req.data.assignedDate = new Date();

    }

        await UPDATE(companyAsset)  .set({ assetStatus: 'ASSIGNED' }).where({ ID: companyAsset_ID });



});



this.on('returnTask', async (req) => {

    const { taskID, documentID, returnReason } = req.data;

    const existTask = await SELECT.one .from(onboardingTask).where({ ID: taskID });

    if (!existTask) {
        return req.reject(404, 'ONBOARDING TASK DOES NOT EXIST');
    }

    
    const existDocument = await SELECT.one.from(employeeDocument).where({ ID: documentID });

    if (!existDocument) {
        return req.reject(404, 'EMPLOYEE DOCUMENT DOES NOT EXIST');
    }

   
    if (existTask.onboardingCasesTask_ID !==existDocument.onboardingCase_ID) {
        return req.reject(400,'DOCUMENT DOES NOT BELONG TO THIS ONBOARDING CASE');
     }

 
    if (existTask.taskStatus === 'COMPLETED') {
        return req.reject( 409,'COMPLETED TASK CANNOT BE RETURNED');
    }

  
    if (!['SUBMITTED', 'VERIFIED'].includes(existDocument.documentStatus)) {
        return req.reject(409,'ONLY SUBMITTED OR VERIFIED DOCUMENTS CAN BE RETURNED');
    }


    if (!returnReason || !returnReason.trim()) {
        return req.reject(400, 'RETURN REASON IS REQUIRED');
    }


    await UPDATE(employeeDocument) .set({  documentStatus: 'RESUBMISSION_REQUIRED',rejectionReason: returnReason}).where({ ID: documentID });

   
    await UPDATE(onboardingTask)  .set({taskStatus: 'PENDING',completedAt: null}).where({ ID: taskID });

    return 'DOCUMENT RETURNED SUCCESSFULLY FOR RESUBMISSION';

});
 
    this.on('closeOnboarding', async (req) => {

    const { caseID } = req.data;

  
    const existCase = await SELECT.one.from(onboardingCases).where({ ID: caseID });

    if (!existCase) {
        return req.reject(404, 'ONBOARDING CASE DOES NOT EXIST');
    }

 
    if (existCase.caseStatus === 'COMPLETED') {
        return req.reject(409, 'ONBOARDING CASE IS ALREADY COMPLETED');
    }

 
    if (existCase.caseStatus === 'CANCELLED') {
        return req.reject(409, 'CANCELLED ONBOARDING CASE CANNOT BE CLOSED');
    }

  
    if (existCase.caseStatus !== 'IN_PROGRESS') {
        return req.reject(409, 'ONBOARDING CASE MUST BE IN PROGRESS BEFORE CLOSING');
    }

    const caseTasks = await SELECT .from(onboardingTask).where({ onboardingCasesTask_ID: caseID });

    if (caseTasks.length === 0) {
        return req.reject(409, 'NO ONBOARDING TASKS FOUND FOR THIS CASE');
    }

   
    const incompleteTasks = caseTasks.filter( task => task.taskStatus !== 'COMPLETED');

    if (incompleteTasks.length > 0) {

        const pendingTaskNames = incompleteTasks.map(task => task.taskName).join(', ');

        return req.reject(409,`ONBOARDING CANNOT BE CLOSED. PLEASE COMPLETE THESE TASKS: ${pendingTaskNames}`);
    }

   
    await UPDATE(onboardingCases).set({caseStatus: 'COMPLETED',completedAt: new Date()}).where({ ID: caseID });

    return 'ONBOARDING CLOSED SUCCESSFULLY';

});


} )