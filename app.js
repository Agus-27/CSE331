var API_URL = 'https://das-lab.org/cse331fa2019/PhotosBackend/';
var POST_GROUP_ID = 23498;

$(document).ready(function() {
  loadResults();
  setupCreatePost();
  setupLeaveFeedback();
});

var APP = {
  results: [],
  availableTags: []
};

function loadResults() {
  function resultHtml(post) {
    return `
      <div class="card result_card">
        <img src="${(API_URL + post.tn_src)}" class="card-img-top"/>
        <h4>${post.payload.title}</h4>
        <p>${post.payload.description}</p>
        <p class="likeCount">${post.payload.likes} ${post.payload.likes === 1 ? 'Like' : 'Likes'}</p>
        <button class="likeBtn" onclick="onLike(${post.id})">Like</button>
        <button class="commentBtn" onclick="onComment(${post.id})">Comment</button>
      </div>
    `;
  }

  function getPost(postId) {
    return new Promise((res, rej) => $.getJSON(API_URL + 'viewPhoto.php?id=' + postId, data => res(data)));
  }

  $.getJSON(API_URL + 'getPhotos.php?grp_id=' + POST_GROUP_ID, (data) => { 
    Promise.all(data.map(result => getPost(result.id))).then(viewResults => {
      const results = viewResults
        .map(([view], i) => {
          const result = data[i];
          const payload = JSON.parse(view.description);

          return {
            ...result,
            ...view,
            payload: {
              likes: 0,
              tags: [],
              ...payload
            },
            description: undefined
          };
        });

      const render = results.map(result => resultHtml(result)).join(' ');
      $("#resultsCards").html(render);

      let allTags = results
        .map(r => r.payload.tags || [])
        .flat()
        .map(t => t.toUpperCase())
        .filter(t => !!t)
        .filter((t, i, a) => a.indexOf(t) === i);
      
      APP.results = results;
      APP.availableTags = allTags;
    })
  });
}

/*
 * Setup code for the create post popup
 */
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
      description: $('#post-description').val(),
      tags: ($('#post-tags').val() || '').toUpperCase().split(' '),
      likes: 0,
      comments: []
    };

    var formData = new FormData(document.forms['uploader']);
    formData.append('description', JSON.stringify(payload));
    formData.append('grp_id', POST_GROUP_ID);

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
      
      $(':file').val('');
      $('#post-title').val('');
      $('#post-description').val('');
      $('#post-tags').val('');
      $('#create-post-modal').modal('hide');
    });
  });
}

function setupLeaveFeedback() {

}

// --------------------------
// Updating a photo

function updatePhoto(photoId, onMutatePayload) {

}

function onComment(postId) {
  alert('Comment');
}

function onLike(postId) {
  alert('Like');
  updatePhoto(postId, function(payload) {
    payload.likeCount = payload.likeCount ? (payload.likeCount + 1) : 1;
    return payload;
  });
}

// --------------------------
// Code for logging

function log(category, code, msg) {
  alert(`${category} / ${code}: ${msg}`);
}

function logError(code, msg) {
  log('ERROR', code, msg);
}

function logAction(code, msg) {
  log('ACTION', code, msg);
}

function logNote(code, msg) {
  log('NOTE', code, msg);
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
