var API_URL = 'https://das-lab.org/cse331fa2019/PhotosBackend/';
var POST_GROUP_ID = 19994;
var KEY = null;
var USER_ID = null;

$(document).ready(function() {
  loadAccount();
  loadResults(true);
  setupCreatePost();
  setupLeaveFeedback();
});

var APP = {
  results: [],
  availableTags: []
};

function loadAccount() {
  let pk = localStorage.getItem('userPrivateKey');
  KEY = new JSEncrypt();

  if (pk) {
    KEY.setPrivateKey(pk);
  } else if (!pk) {
    localStorage.setItem('userPrivateKey', KEY.getPrivateKey());
  }

  if (localStorage.getItem('userId')) {
    USER_ID = localStorage.getItem('userId');
  } else {
    USER_ID = Math.ceil(Math.random() * 1000000);
    localStorage.setItem('userId', USER_ID);
  }
}

function loadResults(isInitial = false) {
  function resultHtml(post) {
    const isOwned = post.payload.publicKey === KEY.getPublicKey();
    const commentCount = (post.payload.comments || []).length || 0;

    return `
      <div class="card result_card">
        <img src="${(API_URL + post.src)}" class="card-img-top" onclick="logAction('POST_MISCLICK', 'User clicked post image')"/>
        <h4 onclick="logAction('POST_MISCLICK', 'User clicked post title')">${post.payload.title}</h4>
        <p class ="commentsP" onclick="logAction('POST_MISCLICK', 'User clicked post description')">${post.payload.description}</p>
        <p class="likeCount" onclick="logAction('POST_MISCLICK', 'User clicked like count')">${post.payload.likes} ${post.payload.likes === 1 ? 'Like' : 'Likes'}</p>
        <button class="likeBtn" onclick="onLike(${post.id})">Like</button>
        <button class="commentBtn" onclick="onComment(${post.id})">Comment</button>
        ${commentCount > 0 && isOwned ? `<button class="viewCommentsBtn" onclick="onViewComments(${post.id})">View ${commentCount} Comment${commentCount === 1 ? '' : 's'}</button>` : ''}
      </div>
    `;
  }

  function getPost(postId) {
    return new Promise((res, rej) => $.getJSON(API_URL + 'viewPhoto.php?id=' + postId, data => res(data)));
  }

  const params = (new URL(document.location)).searchParams;
  const searchTags = (params.get('tags') || '').split(',').filter(t => !!t);

  if (isInitial) {
    if (searchTags.length > 0) {
      logAction('LOADED_FROM_SEARCH#TAG_COUNT', searchTags.length)
      logAction('LOADED_FROM_SEARCH#TAG_VALUES', searchTags)
    } else {
      logAction('LOADED_WITHOUT_SEARCH', 'Page loaded with no search tags selected')
    }
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
        })
        
      const containsTags = (result) => searchTags.length === 0 || (result.payload.tags || []).some(t => searchTags.includes(t));
      const displayResults = results.filter(containsTags);

      const render = displayResults.map(result => resultHtml(result)).join(' ');
      $("#resultsCards").html(render);

      let allTags = results
        .map(r => r.payload.tags || [])
        .flat()
        .map(t => t.toUpperCase())
        .filter(t => !!t)
        .filter((t, i, a) => a.indexOf(t) === i);

      setupAutoComplete(allTags);
      
      APP.results = results;
      APP.availableTags = allTags;
    })
  });
}

function setupAutoComplete(tags) {
  $('#tag-search').tagsInput({
    placeholder: 'Search by tags',
    autocomplete: {
      source: tags
    },
    whitelist: tags
  });
}

/*
 * Setup code for the create post popup
 */
function setupCreatePost() {
  $(':file').on('change', function() {   
    var file = this.files[0];
    logAction('SELECTED_PHOTO', 'User selected a photo to upload');
    
    if (file.size > 10485760) {
      alert('Max upload size is 10 MB.');
      $(':file').val('');
      logError('PHOTO_TOO_LARGE', 'User selected a photo that was too large');
    }
  });

  $('#create-post-btn').on('click', function() {
    logAction('CONFIRM_POST_CREATION', 'User confirmed post creation');

    var payload = { 
      title: $('#post-title').val(), 
      description: $('#post-description').val(),
      tags: ($('#post-tags').val() || '').toUpperCase().split(' '),
      likes: 0,
      comments: [],
      publicKey: KEY.getPublicKey()
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
  logAction('LIKED_POST', 'User clicked like on post: ' + postId);
  updatePhoto(postId, function(payload) {
    payload.likes = payload.likes ? (payload.likes + 1) : 1;
    return payload;
  });
}

function onComment(postId) {
  logAction('CLICKED_COMMENT_ON_POST', 'User clicked comment on post: ' + postId);
  $('#post-id').val(postId);
  $('#comment-msg').val('');
  $('#add-feedback-modal').modal('show');
}

function onViewComments(postId) {
  function commentHtml(comment) {
    return `
      <div class="feedback-comment">
        ${comment}
      </div>
    `;
  }

  const post = APP.results.find(post => post.id == postId);
  const comments = post.payload.comments.map(encryptedMessage => KEY.decrypt(encryptedMessage));
  const renderedComments = comments.map(c => commentHtml(c)).join('');

  logAction('CLICKED_VIEW_COMMENTS', 'User clicked view comments: ' + postId);
  $("#view-feedback-comments").html(renderedComments);
  $('#view-feedback-modal').modal('show');
}

function setupLeaveFeedback() {
  $('#add-comment-btn').on('click', function() {
    const postId = $('#post-id').val();
    const message = $('#comment-msg').val()
    const post = APP.results.find(post => post.id === postId);
    
    if (!post.payload.publicKey) {
      alert('Comments disabled for this post.');
      return;
    }

    const postKey = new JSEncrypt();
    postKey.setPublicKey(post.payload.publicKey);
    
    const encryptedMessage = postKey.encrypt(message);

    logAction('CONFIRM_COMMENT', 'User added a comment to post: ' + postId);

    updatePhoto(postId, function(payload) {
      const comments = payload.comments || [];
      comments.push(encryptedMessage);
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
  const userId = USER_ID;
  const payload = { category, code, message: msg };

  $.ajax({
    url: API_URL + 'logEvent.php',
    type: 'POST',
    data: { grp_id: POST_GROUP_ID, user_id: userId, event: JSON.stringify(payload) }
  }).done(() => console.log(`${category} / ${code}: ${msg}`))
}

// /logEvent.php
// This endpoint can be used to make an entry in your log. It requires the following parameters:
// grp_id
// The ID of the project group who is logging this event.
// user_id
// The ID of the particular user being tracked. Should be an integer.
// event
// A textual description of the event being logged.

function logError(code, msg) {
  log('ERROR', code, msg);
}

function logAction(code, msg) {
  log('ACTION', code, msg);
}

function logNote(code, msg) {
  log('NOTE', code, msg);
}
