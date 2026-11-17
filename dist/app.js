import { createApp } from './assets/vue.js';

createApp({
  data() {
    let favorites = [];
    try {
      const saved = JSON.parse(localStorage.getItem('favorites') || '[]');
      if (Array.isArray(saved)) favorites = saved.filter(id => typeof id === 'string');
    } catch {} // Повреждённое избранное не мешает загрузке приложения.
    return {
      listings: [], query: '', minPrice: '', maxPrice: '', rooms: '', district: '',
      favorites, favoritesOnly: false, selected: null, photoIndex: 0,
      loading: true, error: '', source: '', updatedAt: ''
    };
  },
  computed: {
    districts() {
      return [...new Set(this.listings.map(item => item.district).filter(Boolean))].sort();
    },
    filtered() {
      // Каждая проверка отвечает ровно за один фильтр.
      return this.listings.filter(item => {
        const titleMatches = (item.title || '').toLowerCase().includes(this.query.trim().toLowerCase());
        const minMatches = this.minPrice === '' || (item.price != null && item.price >= Number(this.minPrice));
        const maxMatches = this.maxPrice === '' || (item.price != null && item.price <= Number(this.maxPrice));
        const roomsMatch = this.rooms === '' || (item.rooms != null && (this.rooms === '4' ? item.rooms >= 4 : item.rooms === Number(this.rooms)));
        const districtMatches = !this.district || item.district === this.district;
        const favoriteMatches = !this.favoritesOnly || this.favorites.includes(item.id);
        return titleMatches && minMatches && maxMatches && roomsMatch && districtMatches && favoriteMatches;
      });
    }
  },
  methods: {
    async loadListings() {
      this.loading = true;
      this.error = '';
      try {
        const response = await fetch('./listings.json');
        if (!response.ok) throw new Error('Ошибка загрузки');
        const data = await response.json();
        if (!Array.isArray(data.listings)) throw new Error('Неверный формат данных');
        this.listings = data.listings.filter(item => item && typeof item === 'object');
        // После обновления подборки убираем избранное, которого больше нет.
        this.favorites = this.favorites.filter(id => this.listings.some(item => item.id === id));
        try { localStorage.setItem('favorites', JSON.stringify(this.favorites)); } catch {}
        this.source = data.source;
        this.updatedAt = data.updatedAt;
      } catch {
        this.error = 'Проверьте подключение и попробуйте ещё раз.';
      } finally {
        this.loading = false;
      }
    },
    reset() {
      this.query = this.minPrice = this.maxPrice = this.rooms = this.district = '';
    },
    toggleFavorite(id) {
      this.favorites = this.favorites.includes(id) ? this.favorites.filter(value => value !== id) : [...this.favorites, id];
      try { localStorage.setItem('favorites', JSON.stringify(this.favorites)); } catch {}
    },
    price(value) {
      return value == null ? 'Цена не указана' : Number(value).toLocaleString('ru-RU') + ' ₽';
    },
    roomLabel(value) {
      return value == null ? 'Комнаты не указаны' : value === 0 ? 'Студия' : value + '-комн.';
    },
    openDetails(item) {
      this.selected = item;
      this.photoIndex = 0;
      this.$refs.detailsDialog.showModal();
    },
    closeDetails() { this.$refs.detailsDialog.close(); },
    backdropClick(event) {
      if (event.target === this.$refs.detailsDialog) {
        const rect = event.target.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.closeDetails();
      }
    },
    imageError(event) {
      event.target.onerror = null;
      event.target.src = './assets/no-photo.svg';
    }
  },
  mounted() { this.loadListings(); }
}).mount('#app');
