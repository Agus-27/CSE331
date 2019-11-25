var API_URL = 'https://das-lab.org/cse331fa2019/PhotosBackend/';
var POST_GROUP_ID = 23498;
var USER_ID = null;
var USER_PRIVATE_KEY = null;
var USER_PUBLIC_KEY = null;

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

// --------------------------
// Updating a photo

function updatePhoto(postId, onMutatePayload) {
  function getPost(id) {
    return new Promise((res, rej) => $.getJSON(API_URL + 'viewPhoto.php?id=' + id, data => res(data[0])));
  }

  function updatePost(id, payload) {
    return new Promise((res, rej) => $.ajax({
      url: API_URL + 'updatePhoto.php',
      type: 'POST',
      data: { id: id, description: JSON.stringify(payload) }
    }).done(() => res()));
  }

  return getPost(postId).then(current => {
    const currentPayload = JSON.parse(current.description);
    const newPayload = onMutatePayload(currentPayload);
    return updatePost(postId, newPayload).then(() => loadResults());
  });
}

function onLike(postId) {
  updatePhoto(postId, function(payload) {
    payload.likes = payload.likes ? (payload.likes + 1) : 1;
    return payload;
  });
}

function onComment(postId) {
  $('#post-id').val(postId);
  $('#comment-msg').val('');
  $('#add-feedback-modal').modal('show');
}

function setupLeaveFeedback() {
  $('#add-comment-btn').on('click', function() {
    const postId = $('#post-id').val();
    const message = $('#comment-msg').val()
    
    updatePhoto(postId, function(payload) {
      const comments = payload.comments || [];
      comments.push(message);
      payload.comments = comments;
      return payload;
    }).then(() => {
      $('#post-id').val('');
      $('#comment-msg').val('');
      $('#add-feedback-modal').modal('hide');
    });
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
