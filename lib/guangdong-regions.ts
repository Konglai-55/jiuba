// 广东省所有城市及下辖区县
export interface District {
  id: string
  name: string
}

export interface City {
  id: string
  name: string
  districts: District[]
}

export const GUANGDONG_CITIES: City[] = [
  {
    id: 'guangzhou',
    name: '广州市',
    districts: [
      { id: 'gz-yuexiu', name: '越秀区' },
      { id: 'gz-liwan', name: '荔湾区' },
      { id: 'gz-haizhu', name: '海珠区' },
      { id: 'gz-tianhe', name: '天河区' },
      { id: 'gz-baiyun', name: '白云区' },
      { id: 'gz-huangpu', name: '黄埔区' },
      { id: 'gz-panyu', name: '番禺区' },
      { id: 'gz-huadu', name: '花都区' },
      { id: 'gz-nansha', name: '南沙区' },
      { id: 'gz-conghua', name: '从化区' },
      { id: 'gz-zengcheng', name: '增城区' },
    ],
  },
  {
    id: 'shenzhen',
    name: '深圳市',
    districts: [
      { id: 'sz-futian', name: '福田区' },
      { id: 'sz-luohu', name: '罗湖区' },
      { id: 'sz-nanshan', name: '南山区' },
      { id: 'sz-yantian', name: '盐田区' },
      { id: 'sz-baoan', name: '宝安区' },
      { id: 'sz-longgang', name: '龙岗区' },
      { id: 'sz-longhua', name: '龙华区' },
      { id: 'sz-pingshan', name: '坪山区' },
      { id: 'sz-guangming', name: '光明区' },
      { id: 'sz-dapeng', name: '大鹏新区' },
    ],
  },
  {
    id: 'zhuhai',
    name: '珠海市',
    districts: [
      { id: 'zh-xiangzhou', name: '香洲区' },
      { id: 'zh-doumen', name: '斗门区' },
      { id: 'zh-jinwan', name: '金湾区' },
    ],
  },
  {
    id: 'shantou',
    name: '汕头市',
    districts: [
      { id: 'st-longhu', name: '龙湖区' },
      { id: 'st-jinping', name: '金平区' },
      { id: 'st-haojiang', name: '濠江区' },
      { id: 'st-chaoyang', name: '潮阳区' },
      { id: 'st-chaonan', name: '潮南区' },
      { id: 'st-chenghai', name: '澄海区' },
      { id: 'st-nan ao', name: '南澳县' },
    ],
  },
  {
    id: 'foshan',
    name: '佛山市',
    districts: [
      { id: 'fs-chancheng', name: '禅城区' },
      { id: 'fs-nanhai', name: '南海区' },
      { id: 'fs-shunde', name: '顺德区' },
      { id: 'fs-sanshui', name: '三水区' },
      { id: 'fs-gaoming', name: '高明区' },
    ],
  },
  {
    id: 'shaoguan',
    name: '韶关市',
    districts: [
      { id: 'sg-wujiang', name: '武江区' },
      { id: 'sg-zhenjiang', name: '浈江区' },
      { id: 'sg-qujiang', name: '曲江区' },
      { id: 'sg-lechang', name: '乐昌市' },
      { id: 'sg-nanxiong', name: '南雄市' },
      { id: 'sg-renhua', name: '仁化县' },
      { id: 'sg-shixing', name: '始兴县' },
      { id: 'sg-wengyuan', name: '翁源县' },
      { id: 'sg-ruyuan', name: '乳源瑶族自治县' },
      { id: 'sg-xinfeng', name: '新丰县' },
    ],
  },
  {
    id: 'zhanjiang',
    name: '湛江市',
    districts: [
      { id: 'zj-chikan', name: '赤坎区' },
      { id: 'zj-xiashan', name: '霞山区' },
      { id: 'zj-potou', name: '坡头区' },
      { id: 'zj-mazhang', name: '麻章区' },
      { id: 'zj-wuchuan', name: '吴川市' },
      { id: 'zj-leizhou', name: '雷州市' },
      { id: 'zj-lianjiang', name: '廉江市' },
      { id: 'zj-suixi', name: '遂溪县' },
      { id: 'zj-xuwen', name: '徐闻县' },
    ],
  },
  {
    id: 'jiangmen',
    name: '江门市',
    districts: [
      { id: 'jm-pengjiang', name: '蓬江区' },
      { id: 'jm-jianghai', name: '江海区' },
      { id: 'jm-xinhui', name: '新会区' },
      { id: 'jm-taishan', name: '台山市' },
      { id: 'jm-kaiping', name: '开平市' },
      { id: 'jm-heshan', name: '鹤山市' },
      { id: 'jm-enping', name: '恩平市' },
    ],
  },
  {
    id: 'maoming',
    name: '茂名市',
    districts: [
      { id: 'mm-maonan', name: '茂南区' },
      { id: 'mm-dianbai', name: '电白区' },
      { id: 'mm-gaozhou', name: '高州市' },
      { id: 'mm-huazhou', name: '化州市' },
      { id: 'mm-xinyi', name: '信宜市' },
    ],
  },
  {
    id: 'zhaoqing',
    name: '肇庆市',
    districts: [
      { id: 'zq-duanzhou', name: '端州区' },
      { id: 'zq-dinghu', name: '鼎湖区' },
      { id: 'zq-gaoyao', name: '高要区' },
      { id: 'zq-sihui', name: '四会市' },
      { id: 'zq-guangning', name: '广宁县' },
      { id: 'zq-deqing', name: '德庆县' },
      { id: 'zq-fengkai', name: '封开县' },
      { id: 'zq-huaiji', name: '怀集县' },
    ],
  },
  {
    id: 'huizhou',
    name: '惠州市',
    districts: [
      { id: 'hz-huicheng', name: '惠城区' },
      { id: 'hz-huiyang', name: '惠阳区' },
      { id: 'hz-boluo', name: '博罗县' },
      { id: 'hz-huidong', name: '惠东县' },
      { id: 'hz-longmen', name: '龙门县' },
    ],
  },
  {
    id: 'meizhou',
    name: '梅州市',
    districts: [
      { id: 'mz-meijiang', name: '梅江区' },
      { id: 'mz-meixian', name: '梅县区' },
      { id: 'mz-xingning', name: '兴宁市' },
      { id: 'mz-dabu', name: '大埔县' },
      { id: 'mz-fengshun', name: '丰顺县' },
      { id: 'mz-wuhua', name: '五华县' },
      { id: 'mz-pingyuan', name: '平远县' },
      { id: 'mz-jiaoling', name: '蕉岭县' },
    ],
  },
  {
    id: 'shanwei',
    name: '汕尾市',
    districts: [
      { id: 'sw-chengqu', name: '城区' },
      { id: 'sw-haifeng', name: '海丰县' },
      { id: 'sw-lufeng', name: '陆丰市' },
      { id: 'sw-luhe', name: '陆河县' },
    ],
  },
  {
    id: 'heyuan',
    name: '河源市',
    districts: [
      { id: 'hy-yuancheng', name: '源城区' },
      { id: 'hy-zijin', name: '紫金县' },
      { id: 'hy-longchuan', name: '龙川县' },
      { id: 'hy-lianping', name: '连平县' },
      { id: 'hy-heping', name: '和平县' },
      { id: 'hy-dongyuan', name: '东源县' },
    ],
  },
  {
    id: 'yangjiang',
    name: '阳江市',
    districts: [
      { id: 'yj-jiangcheng', name: '江城区' },
      { id: 'yj-yangdong', name: '阳东区' },
      { id: 'yj-yangchun', name: '阳春市' },
      { id: 'yj-yangxi', name: '阳西县' },
    ],
  },
  {
    id: 'qingyuan',
    name: '清远市',
    districts: [
      { id: 'qy-qingcheng', name: '清城区' },
      { id: 'qy-qingxin', name: '清新区' },
      { id: 'qy-yingde', name: '英德市' },
      { id: 'qy-lianzhou', name: '连州市' },
      { id: 'qy-fogang', name: '佛冈县' },
      { id: 'qy-yangshan', name: '阳山县' },
      { id: 'qy-lianshan', name: '连山壮族瑶族自治县' },
      { id: 'qy-liannan', name: '连南瑶族自治县' },
    ],
  },
  {
    id: 'dongguan',
    name: '东莞市',
    districts: [
      { id: 'dg-nancheng', name: '南城街道' },
      { id: 'dg-dongcheng', name: '东城街道' },
      { id: 'dg-wanjiang', name: '万江街道' },
      { id: 'dg-guancheng', name: '莞城街道' },
      { id: 'dg-shipai', name: '石碣镇' },
      { id: 'dg-shilong', name: '石龙镇' },
      { id: 'dg-chashan', name: '茶山镇' },
      { id: 'dg-shijie', name: '石排镇' },
      { id: 'dg-qishi', name: '企石镇' },
      { id: 'dg-hengli', name: '横沥镇' },
      { id: 'dg-qiaotou', name: '桥头镇' },
      { id: 'dg-xiegang', name: '谢岗镇' },
      { id: 'dg-dongkeng', name: '东坑镇' },
      { id: 'dg-changping', name: '常平镇' },
      { id: 'dg-liaobu', name: '寮步镇' },
      { id: 'dg-dalang', name: '大朗镇' },
      { id: 'dg-huangjiang', name: '黄江镇' },
      { id: 'dg-qingxi', name: '清溪镇' },
      { id: 'dg-tangxia', name: '塘厦镇' },
      { id: 'dg-fenggang', name: '凤岗镇' },
      { id: 'dg-zhangmutou', name: '樟木头镇' },
      { id: 'dg-dalingshan', name: '大岭山镇' },
      { id: 'dg-humen', name: '虎门镇' },
      { id: 'dg-chang an', name: '长安镇' },
      { id: 'dg-shatian', name: '沙田镇' },
      { id: 'dg-daojiao', name: '道滘镇' },
      { id: 'dg-hongmei', name: '洪梅镇' },
      { id: 'dg-machong', name: '麻涌镇' },
      { id: 'dg-wangniudun', name: '望牛墩镇' },
      { id: 'dg-zhongtang', name: '中堂镇' },
      { id: 'dg-gaobu', name: '高埗镇' },
      { id: 'dg-songshan', name: '松山湖' },
    ],
  },
  {
    id: 'zhongshan',
    name: '中山市',
    districts: [
      { id: 'zs-shiqi', name: '石岐街道' },
      { id: 'zs-dongqu', name: '东区街道' },
      { id: 'zs-xiqu', name: '西区街道' },
      { id: 'zs-nanqu', name: '南区街道' },
      { id: 'zs-wuguishan', name: '五桂山街道' },
      { id: 'zs-huoju', name: '火炬开发区' },
      { id: 'zs-huangpu', name: '黄圃镇' },
      { id: 'zs-nanlang', name: '南朗街道' },
      { id: 'zs-minzhong', name: '民众街道' },
      { id: 'zs-sanxiang', name: '三乡镇' },
      { id: 'zs-banfu', name: '板芙镇' },
      { id: 'zs-shenwan', name: '神湾镇' },
      { id: 'zs-tanzhou', name: '坦洲镇' },
      { id: 'zs-sanjiaotown', name: '三角镇' },
      { id: 'zs-henglan', name: '横栏镇' },
      { id: 'zs-nantou', name: '南头镇' },
      { id: 'zs-fusha', name: '阜沙镇' },
      { id: 'zs-dongfeng', name: '东凤镇' },
      { id: 'zs-xiaolan', name: '小榄镇' },
      { id: 'zs-dongsheng', name: '东升街道' },
      { id: 'zs-guzheng', name: '古镇镇' },
      { id: 'zs-shaxi', name: '沙溪镇' },
      { id: 'zs-dachong', name: '大涌镇' },
    ],
  },
  {
    id: 'chaozhou',
    name: '潮州市',
    districts: [
      { id: 'cz-xiangqiao', name: '湘桥区' },
      { id: 'cz-chaoan', name: '潮安区' },
      { id: 'cz-raoping', name: '饶平县' },
    ],
  },
  {
    id: 'jieyang',
    name: '揭阳市',
    districts: [
      { id: 'jy-rongcheng', name: '榕城区' },
      { id: 'jy-jiedong', name: '揭东区' },
      { id: 'jy-puning', name: '普宁市' },
      { id: 'jy-jiexi', name: '揭西县' },
      { id: 'jy-huilai', name: '惠来县' },
    ],
  },
  {
    id: 'yunfu',
    name: '云浮市',
    districts: [
      { id: 'yf-yuncheng', name: '云城区' },
      { id: 'yf-yunan', name: '云安区' },
      { id: 'yf-luoding', name: '罗定市' },
      { id: 'yf-xinxing', name: '新兴县' },
      { id: 'yf-yunan2', name: '郁南县' },
    ],
  },
]

// 获取所有城市的扁平列表（用于简单选择）
export function getAllCities(): { id: string; name: string }[] {
  return GUANGDONG_CITIES.map((city) => ({ id: city.id, name: city.name }))
}

// 根据城市ID获取该城市的所有区县
export function getDistrictsByCity(cityId: string): District[] {
  const city = GUANGDONG_CITIES.find((c) => c.id === cityId)
  return city?.districts || []
}

// 根据区县ID获取区县名称
export function getDistrictName(districtId: string): string | null {
  for (const city of GUANGDONG_CITIES) {
    const district = city.districts.find((d) => d.id === districtId)
    if (district) return district.name
  }
  return null
}

// 根据城市ID获取城市名称
export function getCityName(cityId: string): string | null {
  const city = GUANGDONG_CITIES.find((c) => c.id === cityId)
  return city?.name || null
}

// 获取完整的地区显示名称（城市 + 区县）
export function getFullRegionName(cityId: string, districtId?: string): string {
  const cityName = getCityName(cityId)
  if (!cityName) return ''
  if (!districtId) return cityName
  const districtName = getDistrictName(districtId)
  return districtName ? `${cityName} ${districtName}` : cityName
}
