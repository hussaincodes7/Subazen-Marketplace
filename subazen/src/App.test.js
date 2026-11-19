import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import { thunk } from 'redux-thunk';
import { MemoryRouter } from 'react-router-dom';
import rootReducer from './reducers';
import App from './App';
import Header from './components/Header';

const renderApp = () => render(<Provider store={createStore(rootReducer, applyMiddleware(thunk))}><App /></Provider>);
beforeEach(() => localStorage.clear());

test('renders the Subazen storefront home page', () => {
  renderApp();
  expect(screen.getByRole('heading', { name: /available products/i })).toBeInTheDocument();
});

test('lets a customer switch from login to account creation', () => {
  const authStore = createStore(rootReducer, applyMiddleware(thunk));
  render(<MemoryRouter><Provider store={authStore}><Header /></Provider></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.queryByText('Failed to login')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
  expect(screen.getByRole('heading', { name: 'Sign up' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'First name' })).toBeInTheDocument();
});
