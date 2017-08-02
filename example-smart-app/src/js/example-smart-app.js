(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      alert('Loading Error: ' + arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();


        //  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Write a Patient ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        //mec...doit(smart);
        //putProcedures(smart, pt);
        updatePatient(smart, pt);


        //  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Conditions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        getConditions(smart, pt);

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Observations ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        getObservations(smart, pt);

        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Procedures ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        getProcedures(smart, pt);


        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      }
                    }
                  });

        //alert('mec...here...444');

        $.when(pt, obv).fail(onError);

        $.when(pt, obv).done(function(patient, obv) {
          //alert('mec...Observation length = (' + obv.length + ')' );
          //alert('mec...here...555');
          var byCodes = smart.byCodes(obv, 'code');
          //alert('mec...Observation text = (' + byCodes('text') + ')' );
          var gender = patient.gender;
          var dob = new Date(patient.birthDate);
          var day = dob.getDate() + 1; //mec... bug off by 1 day (counts from 0 ???)
          var monthIndex = dob.getMonth() + 1;
          var year = dob.getFullYear();

          var dobStr = monthIndex + '/' + day + '/' + year;
          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');
          //alert('mec...here...666');

          var p = defaultPatient();
          p.birthdate = dobStr;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.age = parseInt(calculateAge(dob));
          p.height = getQuantityValueAndUnit(height[0]);
          //alert('mec...here...AAA');

          if (typeof systolicbp != 'undefined') {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }
          //alert('mec...here...BBB');

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);
          //alert('mec...here...CCC');

          var outputString = '';
          var effDate = '';
          if ((typeof height[0] != 'undefined') && (typeof height[0].effectiveDateTime != 'undefined') ) {
            effDate = height[0].effectiveDateTime;
          }


          outputString = ('(' + patient.id + ',   ' + patient.name[0].family + ',   ' + patient.birthDate + ',   ' + effDate + ')');

          if ((typeof patient.name[0].use != 'undefined')) {
            outputString += (' USE (' + patient.name[0].use + ')');
          }
          if ((typeof patient.name[0].period != 'undefined') && (typeof patient.name[0].period.start != 'undefined')) {
            outputString += (' PERIOD (' + patient.name[0].period.start + ')');
          }
          if ((typeof patient.careProvider != 'undefined') &&(typeof patient.careProvider[0] != 'undefined') && (typeof patient.careProvider[0].display != 'undefined')) {
            outputString += (' CARE PROVIDER (' + patient.careProvider[0].display + ')');
          }
          //alert('mec...:' + outputString);
          console.log('Patient info: ', outputString);

          //var mec = 'bogus...';
          p.ldl = diastolicbp;

          ret.resolve(p);
        });
        //alert('mec...here...777');

      } else {
        onError();
      }
    }
    //alert('mec...here...888');

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  // VVV ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Conditions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  function getConditions(smart, pt){
    //alert('mec...Conditions');
    var cond = smart.patient.api.fetchAll({
      type: 'Condition',
      //category: 'problem',
      //clinicalstatus: 'active' // 'resolved'
      // ,count: 50 // mec... doesn't work??? - NOT NEEDED!!!
    });
    //alert('mec...here...111');

    $.when(pt, cond).fail(
        function () {
          console.log('Loading error', arguments);
          alert('Loading Error: ' + arguments);
        }
    );

    $.when(pt, cond).done(function(patient, cond) {
      $("#patientName").text(patient.name[0].given + ' ' + patient.name[0].family + ' (' + patient.id + ')' + ' - ' + 'Conditions ' + '(' + cond.length + ')'); //mec...fix...

      cond.forEach(function (cnd) {

        var cndCode = '';
        if ((typeof cnd.code != 'undefined') && (typeof cnd.code.coding != 'undefined') && (typeof cnd.code.coding[0] != 'undefined') && (typeof cnd.code.coding[0].code != 'undefined')) {
          cndCode = cnd.code.coding[0].code;
        }
        //else {
        //  alert('frik');
        //}

        var cndRow = "<tr><td>" + cnd.dateRecorded + "</td>" + "<td>" + cndCode + "</td>" + "<td>" + cnd.code.text + "</td></tr>";
        $("#cndTable").append(cndRow);
        //alert('mec...FFF... ('+ cndRow + ')');

      });

    });
  }
  // ^^^ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Conditions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


  // VVV ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Observations ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  function getObservations(smart, pt){
    //alert('mec...Observations');

    var obsv = smart.patient.api.fetchAll({
      type: 'Observation',
      query: {
        code: {
          $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
            'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
            'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
        }
      }
    });

    //alert('mec...here...DDD');

    $.when(pt, obsv).fail(
        function () {
          console.log('Loading error', arguments);
          alert('Loading Error: ' + arguments);
        }
    );

    $.when(pt, obsv).done(function(patient, obsv) {
      $("#patientObs").text(patient.name[0].given + ' ' + patient.name[0].family + ' (' + patient.id + ')' + ' - ' + 'Observations ' + '(' + obsv.length + ')'); //mec...fix...

      obsv.forEach(function (obs) {

        var obsCode = '';
        if ((typeof obs.code != 'undefined') && (typeof obs.code.coding != 'undefined') && (typeof obs.code.coding[0] != 'undefined') && (typeof obs.code.coding[0].code != 'undefined')) {
          obsCode = obs.code.coding[0].code;
        }
        //else {
        //  alert('frik');
        //}

        var obsRow = "<tr><td>" + obs.effectiveDateTime + "</td>" + "<td>" + obsCode + "</td>" + "<td>" + obs.code.text + "</td></tr>";
        $("#obsTable").append(obsRow);

        //var byCodes = smart.byCodes(obsv, 'code');
        //alert('mec...HHH... ('+ byCodes(obsCode) + ')');

        //alert('mec...GGG');
      });

    });
  }
  // ^^^ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Observations ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


  // VVV ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Procedures ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  function getProcedures(smart, pt){
    //alert('mec...Procedure');
    var proc = smart.patient.api.fetchAll({
      type: 'Procedure'
    });
    //alert('mec...here...111');

    $.when(pt, proc).fail(
        function () {
          console.log('Loading Procedures error', arguments);
          alert('Loading Procedures Error: ' + arguments);
        }
    );

    $.when(pt, proc).done(function(patient, proc) {
      $("#patientProc").text(patient.name[0].given + ' ' + patient.name[0].family + ' (' + patient.id + ')' + ' - ' + 'Procedures ' + '(' + proc.length + ')'); //mec...fix...

      proc.forEach(function (prc) {
        var prcCode = '';
        if ((typeof prc.code != 'undefined') && (typeof prc.code.coding != 'undefined') && (typeof prc.code.coding[0] != 'undefined') && (typeof prc.code.coding[0].code != 'undefined')) {
          prcCode = prc.code.coding[0].code;
        }
        //else {
        //  alert('frik');
        //}

        var prcRow = "<tr><td>" + prc.performedDateTime + "</td>" + "<td>" + prcCode + "</td>" + "<td>" + prc.code.text + "</td></tr>";
        $("#prcTable").append(prcRow);
        //alert('mec...FFF... ('+ prcRow + ')');

      });

    });
  }
  // ^^^ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Procedures ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~



  // VVV ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Procedures ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  function putProcedures(smart, pt){
    alert('mec...PUT Procedure');
    var proc = smart.patient.api.fetchAll({
      type: 'Procedure'
    });
    //alert('mec...here...111');

    $.when(pt, proc).fail(
        function () {
          console.log('Putting Procedures error', arguments);
          alert('Putting Procedures Error: ' + arguments);
        }
    );

    $.when(pt, proc).done(function(patient, proc) {
      proc.forEach(function (prc) {
        var json = JSON.stringify(prc); //mec...(eval("(" + prc + ")"));
        alert('mec...COOL WITH ('+ json +')');

        var mmm = smart.api.create({resource: prc}); //mec...{resource: json},cb,err);
        $.when(pt, mmm).fail(
            function () {
              console.log('Create Procedures error ', mmm);
              alert('Create Procedures Error: (' + mmm + ',' + mmm +')');
            }
        );

        $.when(pt, mmm).done(function(patient, mmm) {
          alert('mec...MAGIC!!!!!!!!!!!!!');
        });
      });

    });
  }
  // ^^^ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Procedures ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


  // VVV ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Patient ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  function readPatient(smart) {
    var patient = smart.patient;
    var pt = patient.read();
    alert('mec...returning (' + pt.id + ',' + pt.resourceType + ')');
    return pt;

    //var patient;
    //smart.patient.read().then(function(pt) {
    //  patient = pt;
    //});
    //return patient;
  }

  function updatePatient(smart, pt) {
    var patient = readPatient(smart);
    alert('mec... 111... patient = (' + patient.id + ',' + patient.resourceType + ')');


    //var patient = smart.patient;
    //var pt = patient.read();
    //
    //alert('mec...TOP... in UPDATE patient (' + pt.resourceType + ',' + pt.id + ')');
    //alert('mec...555... in UPDATE SMART patient (' + smart.patient.id + ',' + smart.patient.resourceType + ',' + smart.patient + ',' + JSON.stringify(smart.patient) + ')');
    //alert('mec...xxx... in UPDATE patient (' + pt.resourceType + ',' + pt + ',' + JSON.stringify(pt) + ')');
    ////pt.name[0].family[0] = "NewName";
    //pt.birthDate = "1946-08-22"; //ORG
    //pt.birthDate = "1946-08-24"; // NEW- DO NOT KEEP THIS, it is the WRONG birthdata
    //
    //smart.api.update({
    //  type: pt.resourceType,
    //  data: JSON.stringify(pt),
    //  id: pt.id
    //}).then(function () {
    //  //mec...readPatient()
    //  alert('mec...COOL!!!!!');
    //});


    //alert('mec...Update Patient');
    //alert('mec...TOP... in UPDATE patient (' + pt.resourceType + ',' + pt.id + ')');
    //alert('mec...666... in UPDATE SMART patient (' + smart.patient.id + ',' + smart.patient.resourceType + ',' + smart.patient + ',' + JSON.stringify(smart.patient) + ')');
    //alert('mec...666... in UPDATE patient (' + pt.resourceType + ',' + pt + ',' + JSON.stringify(pt) + ')');
    //
    //pt.birthDate = "1946-08-22"; //ORG
    //pt.birthDate = "1946-08-24"; // NEW- DO NOT KEEP THIS, it is the WRONG birthdata
    //
    //alert('mec...xxx... in UPDATE patient birthdate (' + pt.birthDate + ')');
    //
    //var proc = smart.patient.api.update({
    //  type: pt.resourceType,
    //  data: JSON.stringify(pt),
    //  id: pt.id
    //});
    ////alert('mec...here...111');
    //
    //$.when(pt, proc).fail(
    //    function () {
    //      console.log('Updating Patient error', arguments);
    //      alert('Updating Patient Error: ' + arguments);
    //    }
    //);
    //
    //$.when(pt, proc).done(function(patient, proc) {
    //  alert('mec...MAGIC!!!!!!!!!!!!!!!!!!!!');
    //});

  }
  // ^^^ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Patient ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


  function doit(smart) {
    // THIS FAILED to WRITE to Cerner!!!!!!!!!!

    //alert('in doit() - top top');
    alert('mec...in doit TOP smart has (' + smart.hasOwnProperty('patient') + ')');


    var resource = {
      "resourceType": "Procedure",
      "id": "36462565",
      "meta": {
        "versionId": "0",
        "lastUpdated": "2017-08-01T01:02:03.000Z"
      },
      "text": {
        "status": "generated",
        "div": "<div><p><b>Procedure</b></p><p><b>Subject</b>: SMART, FRED RICK</p><p><b>Code</b>: Renal angiogram, 420013002</p><p><b>Status</b>: Completed</p><p><b>Location</b>: Baseline East</p><p><b>Notes</b>: <ul><li>This is a procedure comment</li></ul></p></div>"
      },
      "subject": {
        "reference": "Patient/4478007",
        "display": "SMART, FRED RICK"
      },
      "status": "completed",
      "code": {
        "coding": [
          {
            "system": "http://snomed.info/sct",
            "code": "420013002",
            "display": "Fluoroscopic angiography of renal artery (procedure)"
          }
        ],
        "text": "Renal angiogram"
      },
      "reasonReference": {
        "reference": "Condition/d36486653",
        "display": "Renal disease"
      },
      "performer": [
        {
          "actor": {
            "reference": "Practitioner/2796007",
            "display": "Pass, Neo"
          }
        }
      ],
      "performedDateTime": "2017-08-01T10:02:03.000-08:00",
      "encounter": {
        "reference": "Encounter/4135906"
      },
      "location": {
        "reference": "Location/4048128",
        "display": "Baseline East"
      },
      "notes": [
        {
          "authorReference": {
            "reference": "Practitioner/4474007",
            "display": "Pickering, Kathy"
          },
          "time": "2017-08-01T01:02:03.000Z",
          "text": "Mec... Procedure"
        }
      ]
    };


    alert('mec...BEFORE of meat');

    // Create the patient and then update its active flag to "true"
    smart.patient.api.create({resource: resource},cb,err).done(function (r) {
      alert('mec...top of meat');

      // NOTE that the patient will now have new "id" assigned by the
      // server. The next request will be PUT (update) and that id will
      // be required...
      //var patient = r.data;
      //patient["active"] = true;
      //smart.patient.api.update({resource: patient}).done(function (r) {
      //  var out = JSON.stringify(r.data, null, "   ");
      //  alert('mec... (' + out + ')');
      //  //document.getElementsByTagName("pre")[0].innerText = "Now " +
      //  //    "we have the following patient in the FHIR server:\n\n" +
      //  //    out;
      //});

      alert('mec...bot of meat');

    });

    alert('out doit - bottom');

  };



  function doitJUNK(smart) {
    // THIS FAILED to WRITE to Cerner!!!!!!!!!!

    //alert('in doit() - top top');
    alert('mec...in doit TOP smart has (' + smart.hasOwnProperty('patient') + ')');


    var resource = {
      "resourceType": "Patient",
      "text": {
        "status": "generated",
        "div": "<div><p>Mycool Campcool</p></div>"
      },
      "identifier": [
        {
          "use": "usual",
          "type": {
            "coding": [
              {
                "system": "http://hl7.org/fhir/v2/0203",
                "code": "MR",
                "display": "Medical record number"
              }
            ],
            "text": "Medical record number"
          },

          "system": "http://hospital.smarthealthit.org",
          "value": "12345"

          //"system": "urn:oid:1.1.1.1.1.1",
          //"value": "12345",
          //"period": {
          //  "start": "2017-07-27T15:01:02.000Z"
          //}

        }
      ],
      "active": false,
      "name": [
        {
          "use": "official",
          "family": [
            "Campcool"
          ],
          "given": [
            "Mycool"
          ]
        }
      ],
      "gender": "male",
      "birthDate": "2000-04-01",
    };

    var resource2 = smart.patient.api.create( {
      "resourceType": "Patient",
      "text": {
        "status": "generated",
        "div": "<div><p>Mycool Campcool</p></div>"
      },
      "identifier": [
        {
          "use": "usual",
          "type": {
            "coding": [
              {
                "system": "http://hl7.org/fhir/v2/0203",
                "code": "MR",
                "display": "Medical record number"
              }
            ],
            "text": "Medical record number"
          },

          "system": "http://hospital.smarthealthit.org",
          "value": "12345"

          //"system": "urn:oid:1.1.1.1.1.1",
          //"value": "12345",
          //"period": {
          //  "start": "2017-07-27T15:01:02.000Z"
          //}

        }
      ],
      "active": false,
      "name": [
        {
          "use": "official",
          "family": [
            "Campcool"
          ],
          "given": [
            "Mycool"
          ]
        }
      ],
      "gender": "male",
      "birthDate": "2000-04-01",
    });

    alert('mec...BEFORE meat (' + smart.length + ')');

    $.when(resource2).fail(function (r) {
      if (r==null){
        alert('mec...FAIL ... r==null');
      }
      else {
        alert('mec...FAIL ... NOT null');
      }

    });

    $.when(resource2).done(function (r) {
      alert('mec...WHEWHOO...');
    });

    alert('mec...BEFORE of meat');

    // Create the patient and then update its active flag to "true"
    smart.api.create({resource: resource},cb,err).done(function (r) {
      alert('mec...top of meat');

      // NOTE that the patient will now have new "id" assigned by the
      // server. The next request will be PUT (update) and that id will
      // be required...
      var patient = r.data;
      patient["active"] = true;
      smart.api.update({resource: patient}).done(function (r) {
        var out = JSON.stringify(r.data, null, "   ");
        alert('mec... (' + out + ')');
        //document.getElementsByTagName("pre")[0].innerText = "Now " +
        //    "we have the following patient in the FHIR server:\n\n" +
        //    out;
      });

      alert('mec...bot of meat');

    });

    alert('out doit - bottom');

  };

  function cb() {
    alert('mec...cb');
  }
  function err() {
    alert('mec...err');
  }


  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      age: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},

      //mec...yoyo...
      //conddaterecorded: {value: ''},
      //contcategory: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function isLeapYear(year) {
    return new Date(year, 1, 29).getMonth() === 1;
  }

  function calculateAge(date) {
    if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())) {
      var d = new Date(date), now = new Date();
      var years = now.getFullYear() - d.getFullYear();
      d.setFullYear(d.getFullYear() + years);
      if (d > now) {
        years--;
        d.setFullYear(d.getFullYear() - 1);
      }
      var days = (now.getTime() - d.getTime()) / (3600 * 24 * 1000);
      return years + days / (isLeapYear(now.getFullYear()) ? 366 : 365);
    }
    else {
      return undefined;
    }
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#age').html(p.age);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);

    //mec...yoyo...
    //$('#conddaterecorded').html(p.conddaterecorded);
    //$('#contcategory').html(p.contcategory);
  };

})(window);
