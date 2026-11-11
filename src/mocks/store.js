import {
  SEED_USERS,
  SEED_PROPERTIES,
  SEED_BOOKINGS,
  SEED_INQUIRIES,
  SEED_PAYMENTS,
  SEED_CHATS,
  SEED_NOTIFICATIONS,
  SEED_ANNOUNCEMENTS,
  SEED_COMPLAINTS,
  SEED_REVIEWS,
  SEED_PROMOTIONS,
  SEED_PROMOTION_CONFIG,
  SEED_SYSTEM_REPORTS,
  SEED_PROPERTY_VIEWS,
  SEED_TOUR_OPENS,
  SEED_AGENT_RATINGS,
} from './seedData';

const STORAGE_KEY = 'porch_light_store_v2';

function getInitialState() {
  return {
    users: SEED_USERS,
    properties: SEED_PROPERTIES,
    bookings: SEED_BOOKINGS,
    inquiries: SEED_INQUIRIES,
    payments: SEED_PAYMENTS,
    chats: SEED_CHATS,
    notifications: SEED_NOTIFICATIONS,
    announcements: SEED_ANNOUNCEMENTS,
    complaints: SEED_COMPLAINTS,
    reviews: SEED_REVIEWS,
    agentRatings: SEED_AGENT_RATINGS || [],
    promotions: SEED_PROMOTIONS,
    promotionConfig: SEED_PROMOTION_CONFIG,
    systemReports: SEED_SYSTEM_REPORTS,
    propertyViews: SEED_PROPERTY_VIEWS || [],
    tourOpens: SEED_TOUR_OPENS || [],
    savedPropertyIds: ['prop-1', 'prop-3'],
    currentUser: SEED_USERS[0], // default to demo user
  };
}

class Store {
  constructor() {
    this.subscribers = new Set();
    this.state = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const initial = getInitialState();
        return {
          ...initial,
          ...parsed,
          propertyViews: parsed.propertyViews?.length ? parsed.propertyViews : initial.propertyViews,
          tourOpens: parsed.tourOpens?.length ? parsed.tourOpens : initial.tourOpens,
          agentRatings: parsed.agentRatings?.length ? parsed.agentRatings : initial.agentRatings,
        };
      }
    } catch (e) {
      console.warn('Failed to parse store from localStorage', e);
    }
    const initial = getInitialState();
    this.save(initial);
    return initial;
  }

  save(nextState) {
    this.state = nextState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (e) {
      console.warn('Failed to persist store to localStorage', e);
    }
    this.notify();
  }

  getState() {
    return this.state;
  }

  update(updater) {
    const nextState = typeof updater === 'function' ? updater(this.state) : { ...this.state, ...updater };
    this.save(nextState);
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  notify() {
    for (const listener of this.subscribers) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('Store subscriber error', e);
      }
    }
  }

  resetDemoData() {
    const initial = getInitialState();
    this.save(initial);
    return initial;
  }
}

export const mockStore = new Store();

export async function simulateDelay(min = 300, max = 600) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
