const countryStyles = {
  CN: { name: '中国', theme: 'china' },
  JP: { name: '日本', theme: 'japan' }
};
const fallback = { name: '其他地区', theme: 'world' };
function symbol(country) {
  return '<span class="travel-map-dot country-' + country.theme + '" aria-hidden="true"></span>';
}
