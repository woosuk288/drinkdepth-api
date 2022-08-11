### 환경 변수 구성

[공식 문서](https://firebase.google.com/docs/functions/config-env)q에 .env 작동 안함
firebase.config() 방식 사용

```sh
firebase functions:config:get
firebase functions:config:set kakao.kakao_admin_key=카카오_어드민_키
firebase functions:config:get > .runtimeconfig.json
```
