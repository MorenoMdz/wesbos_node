import axios from 'axios';
import { $ } from './bling';

function ajaxHeart(e) {
  e.preventDefault();
  console.log('hearted');
  // post to the form action (the heart is inside a post form)
  axios
    .post(this.action)
    .then(res => {
      // access the element by the element name, this case this.heart
      const isHearted = this.heart.classList.toggle('heart__button--hearted');
      $('.heart-count').textContent = res.data.hearts.length;
      if (isHearted) {
        this.heart.classList.add('heart__button--float');
        setTimeout(
          () => this.heart.classList.remove('heart--button__float'),
          2500
        );
      }
    })
    .catch(console.error);
}

export default ajaxHeart;
