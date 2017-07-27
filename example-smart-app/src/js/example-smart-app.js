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

        alert('mec...here...TOP');

        var cond = smart.patient.api.fetchAll({
          type: 'Condition',
          category: 'problem',
          clinicalstatus: 'resolved'
          // ,count: 50 // mec... doesn't work??? - NOT NEEDED!!!
        });
        alert('mec...here...111');

        $.when(pt, cond).fail(onError);

        //alert('mec...here...BBB');
        $.when(pt, cond).done(function(patient, cond) {
          $("#patientName").text(patient.name[0].given + ' ' + patient.name[0].family + ' - ' + 'Conditions ' + '(' + cond.length + ')'); //mec...fix...
          //var dr = cond.dateRecorded;
          //alert('mec...here...C ('+ gender + ',' + dr + ',' + dr[0] + ')');
          //alert('mec...here...CCC (' + gender +')');
          //alert('mec...here...ddd len (' + cond.length + ')');

          //alert('mec...here...EEE len (' + cond.length + ',' + cond[0].dateRecorded + ')');
          alert('mec...here...222');

          cond.forEach(function (cnd) {
            //var cndRow = cnd.dateRecorded;
            //alert('mec...eee... ('+ cndRow + ')');
            var cndRow = "<tr><td>" + cnd.dateRecorded + "</td>" + "<td>" + cnd.code.text + "</td></tr>"
            $("#cndTable").append(cndRow);
            //alert('mec...FFF... ('+ cndRow + ')');
          });

        });
        //alert('mec...GGG');
        alert('mec...here...333');


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

        alert('mec...here...444');

        $.when(pt, obv).fail(onError);

        $.when(pt, obv).done(function(patient, obv) {
          alert('mec...here...555');
          var byCodes = smart.byCodes(obv, 'code');
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
          alert('mec...here...666');

          var p = defaultPatient();
          p.birthdate = dobStr;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.age = parseInt(calculateAge(dob));
          p.height = getQuantityValueAndUnit(height[0]);
          alert('mec...here...AAA');

          if (typeof systolicbp != 'undefined') {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }
          alert('mec...here...BBB');

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);
          alert('mec...here...CCC');

          var mmm = 'mec...';
          if (typeof height[0] != 'undefined') {
            mmm = height[0].effectiveDateTime;
          }

          alert('mec...here...('+ patient.id +',   ' + patient.name[0].family + ',   ' + patient.birthDate + ',   ' + patient.name[0].use +',   ' + patient.name[0].period.start + ',   ' + patient.careProvider[0].display + ',   ' + mmm  + ')' );

          //var mec = 'bogus...';
          p.ldl = diastolicbp;

          ret.resolve(p);
        });
        alert('mec...here...777');

      } else {
        onError();
      }
    }
    alert('mec...here...888');

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

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
