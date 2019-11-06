var API_URL = 'https://das-lab.org/cse331fa2019/PhotosBackend/';
var GROUP_ID = 23498;

$(document).ready(function() {
  loadResults();
  setupCreatePost();
});

function loadResults() {
   
  function resultHtml(res) {
    console.log(res)
    return `
      <div class="card result_card">
        <img src=${(API_URL + res.tn_src)} class="card-img-top"/>
        <h4>Post Title</h4>
        <p>Post description goes right here</p>
      </div>
    `;
  }

  $.getJSON(API_URL + 'getPhotos.php?grp_id=' + GROUP_ID, function(data) {
    const render = data.map(result => resultHtml(result)).join(' ');
    $("#resultsCards").html(render);
  });
}

function setupCreatePost() {
  $(':file').on('change', function() {   
    var file = this.files[0];
    if (file.size > 10485760) {
      alert('Max upload size is 10 MB.');
      $(':file').val('');
    }
  });

  $('#create-post-btn').on('click', function() {
    var payload = { 
      title: $('#post-title').val(), 
      description: $('#post-description').val()
    };

    var formData = new FormData(document.forms['uploader']);
    formData.append('description', JSON.stringify(payload));
    formData.append('grp_id', GROUP_ID);

    $.ajax({
      url: API_URL + 'uploadPhoto.php',
      type: 'POST',
      data: formData,
      cache: false,
      contentType: false,
      processData: false,

      xhr: function() {
        var xhr = $.ajaxSettings.xhr();
        if (xhr.upload) {
          // For handling the progress of the upload
          xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) $('progress').attr({ value: e.loaded, max: e.total });
          } , false);
        }
        return xhr;
      }
    }).done(function() {
      loadResults();
      alert("Post Created"); // TODO: beautify
      
      $(':file').val('');
      $('#post-title').val('');
      $('#post-description').val('');
      $('#create-post-modal').modal('hide');
    });
  });
}


// $(':button').on('click', function() 
// {
//     // for data, we want to submit the photo and the description
//     var photoFormData = new FormData(document.forms['uploader']);
//     // include the group ID
//     photoFormData.append('grp_id', 756756);
    // $.ajax({
    //     url: $path_to_backend + 'uploadPhoto.php',
    //     type: 'POST',
    //     data: photoFormData,
    //     // responseType: 'application/json',

    //     // some flags for jQuery
    //     cache: false,
    //     contentType: false,
    //     processData: false,

    //     // Custom XMLHttpRequest
    //     xhr: function() {
    //         var myXhr = $.ajaxSettings.xhr();
    //         if (myXhr.upload) {
    //             // For handling the progress of the upload
    //             myXhr.upload.addEventListener('progress', function(e) {
    //                 if (e.lengthComputable) {
    //                     $('progress').attr({
    //                         value: e.loaded,
    //                         max: e.total,
    //                     });
    //                 }
    //             } , false);
    //         }
    //         return myXhr;
    //     }
    // })
    // .done(function()
    // {
    //     // let user know upload finished
    //     alert("File uploaded!");
    //     // refresh photos
    //     fetchPhotos();
    //     // clear the upload form
    //     $(':file').val('');
    //     $('#description').val('');
    // });
// });
