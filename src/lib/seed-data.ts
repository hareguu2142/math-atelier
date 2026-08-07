import type { Problem } from "./types";

const now = "2026-08-07T00:00:00.000Z";

function item(id: string, title: string, problemMarkdown: string, solutionMarkdown: string, tags: string[], difficulty: number): Problem {
  return {
    id, title, problemMarkdown, tags, difficulty, solved: false, favorite: false, createdAt: now, updatedAt: now,
    solutions: [{ id: `${id}-solution-1`, problemId: id, title: "기본 풀이", contentMarkdown: solutionMarkdown, createdAt: now, updatedAt: now }],
  };
}

export const seedProblems: Problem[] = [
  item("continuous-sum", "연속된 몇 수의 합", `정수 $a_1,a_2,\\ldots,a_n$이 주어져 있다.

이들 중 연속해서 놓인 몇 개의 수를 골라 그 합이 $n$의 배수가 되도록 할 수 있음을 증명하시오. 단, 하나의 수만 고르는 것도 허용한다.`, `앞에서부터의 부분합을 생각한다.

$$S_1=a_1,\\quad S_2=a_1+a_2,\\quad\\ldots,\\quad S_n=a_1+\\cdots+a_n$$

이 중 하나가 $n$의 배수라면 끝이다. 그렇지 않으면 $n$개의 부분합이 갖는 0이 아닌 나머지는 $1,2,\\ldots,n-1$ 중 하나다. 비둘기집 원리에 따라 $i<j$인 두 부분합에 대해 $S_i\\equiv S_j\\pmod n$이다. 따라서

$$S_j-S_i=a_{i+1}+\\cdots+a_j\\equiv0\\pmod n$$

이므로 원하는 연속 구간이 존재한다.`, ["정수론", "비둘기집 원리", "부분합"], 2),
  item("digit-permutation-2026", "숫자를 섞어 2026을 더할 수 있을까?", `어떤 자연수의 십진법 자릿수를 순서만 바꾸어 새로운 자연수를 만들었다.

새로운 수가 원래 수보다 정확히 $2026$만큼 클 수 있는가?`, `불가능하다. 모든 자연수는 각 자리 숫자의 합과 법 $9$에서 합동이다. 자릿수의 순서를 바꾸어도 자리 숫자의 합은 변하지 않으므로 두 수의 차는 반드시 $9$의 배수이다.

하지만 $2026\\equiv1\\pmod 9$이므로 그 차가 $2026$일 수 없다.`, ["정수론", "불변량", "합동식"], 1),
  item("two-divisions", "서로를 옭아매는 두 나눗셈", `양의 정수 $(a,b)$가 다음 두 조건을 모두 만족한다.

$$a+b\\mid a^2+b^2+1$$

$$a^2+b^2\\mid(a+b)^2+1$$

가능한 모든 순서쌍 $(a,b)$를 구하여라.`, `두 번째 조건에서 제수를 한 번 빼면 $a^2+b^2\\mid2ab+1$을 얻는다. $a=b$이면 불가능하다. $a\\ne b$이면 $(a-b)^2\\ge1$이므로 $2ab+1\\le a^2+b^2$이다. 양의 배수 관계 때문에

$$a^2+b^2=2ab+1,\\qquad(a-b)^2=1.$$

대칭성으로 $b=a+1$이라 두자. 첫 번째 조건을 이용하면

$$2a+1\\mid2(a^2+(a+1)^2+1)=(2a+1)^2+3.$$

따라서 $2a+1\\mid3$이고 $a=1$이다. 답은 $\\boxed{(1,2),(2,1)}$이다.`, ["정수론", "나눗셈", "크기 비교"], 4),
  item("replace-with-sum", "두 수의 합으로 바꾸기", `두 칸에 각각 $1$이 적혀 있다. 한 번의 시행에서 한 칸의 수를 두 칸에 적힌 수의 합으로 바꿀 수 있다.

$$\\text{① }(8,13)\\qquad\\text{② }(14,21)$$

만들 수 있는 것을 모두 찾아라.`, `$(8,13)$은 다음 과정으로 만들 수 있다.

$$(1,1)\\to(1,2)\\to(3,2)\\to(3,5)\\to(8,5)\\to(8,13)$$

한편 $\\gcd(a+b,b)=\\gcd(a,b)$이므로 최대공약수는 변하지 않는다. 시작 상태의 최대공약수는 $1$이지만 $\\gcd(14,21)=7$이므로 $(14,21)$은 만들 수 없다.`, ["정수론", "불변량", "최대공약수"], 2),
  item("integer-triple-sums", "세 수의 합이 항상 정수인 경우", `여섯 실수 $x_1,x_2,\\ldots,x_6$가 주어져 있다. 서로 다른 세 지수 $i,j,k$를 어떻게 선택하더라도 $x_i+x_j+x_k\\in\\mathbb Z$라 하자.

어떤 $r\\in\\{0,\\frac13,\\frac23\\}$가 존재하여 모든 $i$에 대해 $x_i-r\\in\\mathbb Z$임을 증명하여라.`, `서로 다른 $i,j$를 고르고 이 둘과 다른 $a,b$를 선택한다. $x_i+x_a+x_b$와 $x_j+x_a+x_b$가 모두 정수이므로 $x_i-x_j\\in\\mathbb Z$이다.

따라서 모든 $x_i$는 같은 소수 부분 $r$을 갖는다. 세 항의 합이 정수이므로 $3r$도 정수다. $0\\le r<1$에서 가능한 값은 $0,\\frac13,\\frac23$뿐이다.`, ["대수", "정수론", "합동"], 2),
  item("third-iterate", "세 번 만에 돌아오는 함수", `연속함수 $f:[0,1]\\to[0,1]$가 모든 $x\\in[0,1]$에 대하여 $f(f(f(x)))=x$를 만족한다고 하자.

모든 $x$에 대해 $f(x)=x$임을 증명하여라.`, `주어진 식으로부터 $f$는 전단사다. 구간 위의 연속 전단사는 엄격히 단조다. $f$가 감소함수라면 $f^3$도 감소함수인데 항등함수는 증가함수이므로 모순이다. 따라서 $f$는 증가함수다.

어떤 $x$에서 $f(x)>x$라면 증가성에 의해 $f^2(x)>f(x)$이고 $f^3(x)>f^2(x)>x$여서 모순이다. $f(x)<x$도 마찬가지다. 그러므로 모든 $x$에서 $f(x)=x$다.`, ["해석학", "함수", "단조성"], 3),
];
